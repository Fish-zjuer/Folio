package app.folio.preview;

import org.json.*;
import java.net.*;
import java.util.*;
import java.io.IOException;
import java.security.MessageDigest;
import java.nio.charset.StandardCharsets;

/** Stored credentials never cross the bridge on read. Business cookies are reused until rejected. */
final class SchoolSession {
  private final Network network;private final Vault vault;
  private final Object ssoLock=new Object();private final Map<String,Object> siteLocks=new HashMap<>();
  private volatile long ssoUntil=0;private volatile boolean practiceVerified=false;
  private volatile long ssoFailureUntil=0;private volatile String ssoFailure="";
  void browserLoginCompleted(){ssoUntil=0;ssoFailureUntil=0;practiceVerified=false;}
  SchoolSession(Network network,Vault vault){this.network=network;this.vault=vault;for(String s:Arrays.asList("academic","homework","practice"))siteLocks.put(s,new Object());}
  JSONObject account() throws Exception {
    JSONObject saved=new JSONObject(vault.get("school-account"));String username=saved.optString("username");
    return new JSONObject().put("username",username).put("hasPassword",!saved.optString("password").isEmpty()).put("accountId",accountId(username));
  }
  static String accountId(String username) throws Exception {if(username.isEmpty())return "";byte[] bytes=MessageDigest.getInstance("SHA-256").digest(username.getBytes(StandardCharsets.UTF_8));StringBuilder out=new StringBuilder();for(byte b:bytes)out.append(String.format(java.util.Locale.ROOT,"%02x",b&255));return out.toString();}
  synchronized JSONObject save(JSONObject input) throws Exception {
    String username=input.optString("username").trim();JSONObject old=new JSONObject(vault.get("school-account"));
    if(!username.matches("[A-Za-z0-9._-]{3,64}"))throw new IOException("请填写有效学号／统一身份认证账号");
    String password=input.has("password")?input.optString("password"):username.equals(old.optString("username"))?old.optString("password"):"";
    if(password.isEmpty()||password.length()>512)throw new IOException("请填写密码");
    boolean changed=!old.optString("username").equals(username);vault.put("school-account",new JSONObject().put("username",username).put("password",password).toString());
    ssoUntil=0;ssoFailureUntil=0;practiceVerified=false;if(changed)network.resetSchoolCookies();JSONObject result=account();return result.put("changed",changed);
  }
  synchronized void forget() throws Exception {vault.put("school-account","{}");ssoUntil=0;ssoFailureUntil=0;practiceVerified=false;network.resetSchoolCookies();}
  private Map<String,String> headers(){Map<String,String> h=new HashMap<>();h.put("Accept","text/html,application/json,*/*");return h;}
  private JSONObject get(String id,String address,boolean follow) throws Exception {return network.request(id,address,"GET",null,headers(),true,follow);}
  private void sso(String id,boolean force) throws Exception {
    synchronized(ssoLock){
      if(!force&&ssoUntil>System.currentTimeMillis()&&network.hasCookie("https://zjuam.zju.edu.cn/cas/login","iPlanetDirectoryPro"))return;
      // Concurrent modules must not submit the same rejected password one after another.
      if(ssoFailureUntil>System.currentTimeMillis())throw new IOException(ssoFailure);
      JSONObject credentials=new JSONObject(vault.get("school-account"));String username=credentials.optString("username"),password=credentials.optString("password");
      if(username.isEmpty()||password.isEmpty())throw new IOException("请先在教务连接中填写学号和密码，或使用官方网页登录");
      int generation=network.generation();network.removeSso();
      JSONObject page=get(id,"https://zjuam.zju.edu.cn/cas/login",false);if(page.optInt("status")!=200)throw new IOException("统一身份认证暂时无法访问，请稍后重试或使用官方网页登录");
      SchoolProtocol.execution(page.optString("body"));JSONObject keyResponse=get(id,"https://zjuam.zju.edu.cn/cas/v2/getPubKey",false);
      if(keyResponse.optInt("status")!=200)throw new IOException("未取得学校登录公钥，请稍后重试");
      JSONObject key=new JSONObject(keyResponse.optString("body"));String encrypted=SchoolProtocol.encryptPassword(password,key.optString("modulus"),key.optString("exponent"));
      Map<String,String> h=headers();h.put("Content-Type","application/x-www-form-urlencoded; charset=UTF-8");h.put("Origin","https://zjuam.zju.edu.cn");h.put("Referer","https://zjuam.zju.edu.cn/cas/login");
      String body=SchoolProtocol.loginForm(page.optString("body"),username,encrypted);
      JSONObject result=network.request(id,"https://zjuam.zju.edu.cn/cas/login","POST",body,h,true,false);
      if(network.generation()!=generation)throw new IOException("学校账号已切换，请重试");
      if(!result.optBoolean("ssoIssued")||!network.hasCookie("https://zjuam.zju.edu.cn/cas/login","iPlanetDirectoryPro")){
        ssoFailure=result.optInt("status")>=400?"学校认证服务返回 HTTP "+result.optInt("status")+"，请稍后重试；原数据已保留":SchoolProtocol.loginFailure(result.optString("body"));ssoFailureUntil=System.currentTimeMillis()+10000;throw new IOException(ssoFailure);
      }
      ssoFailureUntil=0;
      // CAS password login is shared only briefly; each business station retains its own session.
      ssoUntil=System.currentTimeMillis()+120000;
    }
  }
  JSONObject authenticate(String id,String site) throws Exception {
    if(!siteLocks.containsKey(site))throw new IOException("未知学校平台");
    synchronized(siteLocks.get(site)){sso(id,false);try{businessLogin(id,site);}catch(Exception error){if(!expiredException(error))throw error;sso(id,true);businessLogin(id,site);}}
    return new JSONObject().put("authenticated",true).put("site",site);
  }
  private boolean expiredException(Exception error){return error instanceof AuthExpired;}
  private static final class AuthExpired extends IOException {AuthExpired(String message){super(message);}}
  private void businessLogin(String id,String site) throws Exception {
    if(site.equals("homework")){
      String current="https://courses.zju.edu.cn/user/index";
      for(int step=0;step<16;step++){
        JSONObject result=get(id,current,false);int status=result.optInt("status");String location=result.optString("location"),body=result.optString("body");
        if(status>=300&&status<400&&!location.isEmpty()){current=trustedLocation(current,location);continue;}
        String meta=status>=200&&status<300?SchoolProtocol.metaRefresh(body,current):null;if(meta!=null){current=meta;continue;}
        if(status>=200&&status<300&&new URL(current).getHost().equals("courses.zju.edu.cn")&&network.hasCookie("https://courses.zju.edu.cn/api/todos","session"))return;
        if(status==401||status==403||SchoolProtocol.authEndpoint(current)||SchoolProtocol.authBody(body))throw new AuthExpired("学在浙大登录状态失效");
        throw new IOException("学在浙大未完成登录，请使用官方网页登录后重试");
      }throw new IOException("学在浙大登录跳转过多");
    }
    String service=site.equals("practice")?"https://sztz.zju.edu.cn/dekt/":"https://zdbk.zju.edu.cn/jwglxt/xtgl/login_ssologin.html";
    String cas="https://zjuam.zju.edu.cn/cas/login?service="+URLEncoder.encode(service,"UTF-8");JSONObject ticket=get(id,cas,false);
    String location=ticket.optString("location");int status=ticket.optInt("status");
    if(status<300||status>=400||location.isEmpty())throw new AuthExpired("学校认证会话已失效");
    String callback=trustedLocation(cas,location);URL received=new URL(callback),expected=new URL(service);
    if(!received.getHost().equals(expected.getHost())||!received.getPath().equals(expected.getPath())||received.getQuery()==null||!received.getQuery().matches(".*(?:^|&)ticket=[^&]+.*"))throw new IOException("学校认证回调不正确，请使用官方网页登录");
    // The academic callback commonly issues its session on a 302. Following the home page
    // first can enter another login chain and discard that just-created business context.
    JSONObject result=get(id,callback,site.equals("practice"));if(!SchoolProtocol.businessCallbackAccepted(result.optInt("status"),result.optString("body")))throw new AuthExpired("学校平台会话未建立");
    if(site.equals("academic")){if(!network.hasCookie(service,"JSESSIONID")||!network.hasCookie(service,"route"))throw new IOException("教务平台未建立完整会话，请使用官方网页登录");}
    else verifyPracticeContext(id);
  }
  private void verifyPracticeContext(String id) throws Exception {
    String service="https://sztz.zju.edu.cn/dekt/";if(!network.hasCookie(service,"SESSION"))throw new AuthExpired("素质拓展未取得正式会话");
    Map<String,String> h=headers();h.put("Accept","application/json, text/plain, */*");h.put("Content-Type","application/x-www-form-urlencoded");h.put("Origin","https://sztz.zju.edu.cn");h.put("Referer",service);
    JSONObject ctx=network.request(id,"https://sztz.zju.edu.cn/dekt/ctx","POST","",h,true,false);
    if(ctx.optInt("status")!=200||!authenticatedContext(ctx.optString("body")))throw new AuthExpired("素质拓展返回匿名身份，请使用官方网页登录");practiceVerified=true;
  }
  private String trustedLocation(String current,String location) throws Exception {URL next=new URL(new URL(current),location);if(next.getProtocol().equals("http")&&SchoolProtocol.schoolHost(next.getHost()))next=new URL(next.toString().replaceFirst("^http:","https:"));if(!next.getProtocol().equals("https")||!SchoolProtocol.schoolHost(next.getHost()))throw new IOException("学校登录跳转超出可信域名");return next.toString();}
  private boolean authenticatedContext(String body){try{
    JSONObject payload=new JSONObject(body);if(!payload.optBoolean("success")||payload.optInt("code",-1)!=0)return false;
    String text=new String(android.util.Base64.decode(payload.getString("data"),android.util.Base64.DEFAULT),StandardCharsets.UTF_8);JSONObject raw=new JSONObject(text);
    String user=raw.optString("userId").trim();Object anonymous=raw.opt("anonymous");boolean nonAnonymous=Boolean.FALSE.equals(anonymous)||"false".equals(anonymous)||"0".equals(anonymous)||Integer.valueOf(0).equals(anonymous);
    return nonAnonymous&&!user.isEmpty()&&!user.equalsIgnoreCase("ANONYMOUS")&&!String.valueOf(raw.opt("roles")).contains("ANONYMOUS_USER_ROLE");
  }catch(Exception e){return false;}}
  private boolean expired(JSONObject response){int status=response.optInt("status");String body=response.optString("body");if(SchoolProtocol.authStatus(status)||SchoolProtocol.authEndpoint(response.optString("url"))||SchoolProtocol.authBody(body)||status==200&&body.trim().startsWith("<"))return true;try{JSONObject json=new JSONObject(body);int code=json.optInt("code",json.optInt("status"));if(code==401||code==403||code==901||json.optInt("kickout")==1||json.optBoolean("isLogin",true)==false)return true;String message=json.optString("message",json.optString("msg"));return (message.contains("登录")||message.contains("认证")||message.contains("token"))&&(!json.optBoolean("success",true)||code!=0&&code!=200);}catch(Exception e){return false;}}
  JSONObject school(String id,JSONObject input) throws Exception {
    String module=input.optString("module");if(module.equals("calendar"))return network.school(id,input);
    String site=module.equals("homework")?"homework":module.startsWith("practice")?"practice":"academic";
    int generation=network.generation();
    synchronized(siteLocks.get(site)){
      if(generation!=network.generation())throw new IOException("学校账号已切换，请重新同步");
      String probe=site.equals("homework")?"https://courses.zju.edu.cn/api/todos":site.equals("practice")?"https://sztz.zju.edu.cn/dekt/student/home/getSqjl":"https://zdbk.zju.edu.cn/jwglxt/cxdy/xscjcx_cxXscjIndex.html";
      String cookie=site.equals("homework")?"session":site.equals("practice")?"SESSION":"JSESSIONID";
      boolean needsLogin=!network.hasCookie(probe,cookie)||site.equals("academic")&&!network.hasCookie(probe,"route");if(site.equals("practice")&&!needsLogin&&!practiceVerified){try{verifyPracticeContext(id);}catch(AuthExpired e){needsLogin=true;}}
      if(needsLogin){sso(id,false);try{businessLogin(id,site);}catch(AuthExpired e){sso(id,true);businessLogin(id,site);}}
    }
    JSONObject first=network.school(id,input);if(!expired(first))return first;
    synchronized(siteLocks.get(site)){
      if(generation!=network.generation())throw new IOException("学校账号已切换，请重新同步");
      // Another concurrent module may already have repaired this business session.
      JSONObject retry=network.school(id,input);if(!expired(retry))return retry;
      sso(id,false);try{businessLogin(id,site);}catch(AuthExpired e){sso(id,true);businessLogin(id,site);}
    }
    JSONObject retried=network.school(id,input);if(expired(retried))throw new IOException(retried.optInt("status")==901?"教务网重建会话后仍被拒绝（HTTP 901）；原缓存保留，请复制连接诊断排查":"登录仍未完成，请使用官方网页登录；原数据已保留");return retried;
  }
}
