package app.folio.preview;

import android.webkit.CookieManager;
import org.json.JSONObject;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

final class Network {
  private final Map<String,HttpURLConnection> active=new ConcurrentHashMap<>();
  private final Set<String> cancelled=ConcurrentHashMap.newKeySet();
  private final java.net.CookieManager schoolCookies=new java.net.CookieManager(null,SchoolProtocol::cookieDomainAllowed);
  private int schoolGeneration=0;
  private final Deque<String> diagnosticLines=new ArrayDeque<>();
  private synchronized void trace(String line){if(diagnosticLines.size()>=60)diagnosticLines.removeFirst();diagnosticLines.addLast(line);}
  synchronized org.json.JSONArray diagnostics(){return new org.json.JSONArray(new ArrayList<>(diagnosticLines));}
  static String cookieNames(String raw){StringBuilder result=new StringBuilder();for(String pair:raw.split(";")){int p=pair.indexOf('=');if(p<=0)continue;if(result.length()>0)result.append(',');result.append(pair.substring(0,p).trim());}return result.toString();}
  synchronized int generation(){return schoolGeneration;}
  synchronized void resetSchoolCookies(){schoolGeneration++;schoolCookies.getCookieStore().removeAll();}
  synchronized void browserLoginCompleted(){schoolGeneration++;schoolCookies.getCookieStore().removeAll();}
  synchronized String cookies(String address) throws Exception {
    // Native requests see freshly issued cookies immediately, including between redirect hops.
    LinkedHashMap<String,String> values=new LinkedHashMap<>();String stored=CookieManager.getInstance().getCookie(address);
    if(stored!=null)for(String pair:stored.split(";")){int p=pair.indexOf('=');if(p>0)values.put(pair.substring(0,p).trim(),pair.substring(p+1).trim());}
    URI target=new URI(address);List<HttpCookie> candidates=new ArrayList<>(schoolCookies.getCookieStore().getCookies());
    candidates.sort(Comparator.comparingInt(cookie->cookie.getPath()==null?0:cookie.getPath().length()));
    for(HttpCookie cookie:candidates)if(SchoolProtocol.cookieMatches(cookie,target))values.put(cookie.getName(),cookie.getValue());
    StringBuilder out=new StringBuilder();for(Map.Entry<String,String> item:values.entrySet()){if(out.length()>0)out.append("; ");out.append(item.getKey()).append('=').append(item.getValue());}return out.toString();
  }
  boolean hasCookie(String address,String name) throws Exception {return Arrays.stream(cookies(address).split("; ")).anyMatch(pair->pair.startsWith(name+"=")&&pair.length()>name.length()+1);}
  synchronized void promoteSso() throws Exception {
    for(String pair:cookies("https://zjuam.zju.edu.cn/cas/login").split("; "))if(pair.startsWith("iPlanetDirectoryPro=")){
      String value=pair.substring("iPlanetDirectoryPro=".length());if(value.isEmpty())return;
      HttpCookie c=SchoolProtocol.rootSsoCookie(value);schoolCookies.getCookieStore().add(new URI("https://zjuam.zju.edu.cn/"),c);
      CookieManager.getInstance().setCookie("https://zjuam.zju.edu.cn/","iPlanetDirectoryPro="+value+"; Domain=zju.edu.cn; Path=/; Secure; HttpOnly");return;
    }
  }
  private synchronized void acceptIssuedSso(String value) throws Exception {
    // Use the cookie actually issued by this password response, never an old browser cookie.
    for(HttpCookie c:new ArrayList<>(schoolCookies.getCookieStore().getCookies()))if(c.getName().equals("iPlanetDirectoryPro"))for(URI uri:new ArrayList<>(schoolCookies.getCookieStore().getURIs()))schoolCookies.getCookieStore().remove(uri,c);
    schoolCookies.getCookieStore().add(new URI("https://zjuam.zju.edu.cn/"),SchoolProtocol.rootSsoCookie(value));
    CookieManager.getInstance().setCookie("https://zjuam.zju.edu.cn/","iPlanetDirectoryPro="+value+"; Domain=zju.edu.cn; Path=/; Secure; HttpOnly");
  }
  synchronized void removeSso() throws Exception {
    for(HttpCookie c:new ArrayList<>(schoolCookies.getCookieStore().getCookies()))if(c.getName().equals("iPlanetDirectoryPro"))for(URI uri:new ArrayList<>(schoolCookies.getCookieStore().getURIs()))schoolCookies.getCookieStore().remove(uri,c);
    for(String host:Arrays.asList("zjuam.zju.edu.cn","zju.edu.cn"))for(String domain:Arrays.asList("", "; Domain=zju.edu.cn"))CookieManager.getInstance().setCookie("https://"+host+"/","iPlanetDirectoryPro=; Max-Age=0; Path=/"+domain+"; Secure");
  }
  void cancel(String id){cancelled.add(id);HttpURLConnection c=active.remove(id);if(c!=null)c.disconnect();}
  void close(){for(String id:active.keySet())cancel(id);}
  static byte[] readBytes(InputStream input,int limit) throws Exception {
    if(input==null)return new byte[0];
    try(InputStream in=input;ByteArrayOutputStream out=new ByteArrayOutputStream()){
      byte[] buffer=new byte[8192];int n,total=0;
      while((n=in.read(buffer))!=-1){total+=n;if(total>limit)throw new IOException("响应过大，请缩小查询范围");out.write(buffer,0,n);}
      return out.toByteArray();
    }
  }
  static String read(InputStream input,int limit) throws Exception {return new String(readBytes(input,limit),StandardCharsets.UTF_8);}
  JSONObject request(String id,String address,String method,String body,Map<String,String> headers,boolean school) throws Exception {
    return request(id,address,method,body,headers,school,true);
  }
  JSONObject request(String id,String address,String method,String body,Map<String,String> headers,boolean school,boolean follow) throws Exception {
    int generation=generation();
    URL url=new URL(address);
    for(int redirect=0;redirect<16;redirect++){
      if(cancelled.remove(id))throw new IOException("请求已停止");
      if(school&&generation!=generation())throw new IOException("学校账号已切换，请重新同步");
      if(school&&!SchoolProtocol.schoolHost(url.getHost())&&!url.getHost().equals("calendar.celechron.top"))throw new IOException("登录跳转超出学校域名");
      if(!url.getProtocol().equals("https")&&!(school&&url.getHost().equals("calendar.celechron.top")))throw new IOException("连接地址必须使用 HTTPS");
      HttpURLConnection c=(HttpURLConnection)url.openConnection();active.put(id,c);
      try {
        c.setInstanceFollowRedirects(false);c.setConnectTimeout(12000);c.setReadTimeout(school?20000:90000);c.setRequestMethod(method);
        c.setRequestProperty("User-Agent","Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/122.0.0.0 Mobile Safari/537.36 Folio/0.5");
        for(Map.Entry<String,String> e:headers.entrySet())c.setRequestProperty(e.getKey(),e.getValue());
        boolean casPassword=school&&method.equals("POST")&&url.getHost().equals("zjuam.zju.edu.cn")&&url.getPath().equals("/cas/login");
        if(school&&SchoolProtocol.schoolHost(url.getHost())){
          String cookie=cookies(url.toString());if(!cookie.isEmpty())c.setRequestProperty("Cookie",cookie);
        }
        if(body!=null){c.setDoOutput(true);try(OutputStream out=c.getOutputStream()){out.write(body.getBytes(StandardCharsets.UTF_8));}}
        int status=c.getResponseCode();
        HttpCookie issued=casPassword?SchoolProtocol.issuedSso(c.getHeaderFields()):null;
        if(school){String location=c.getHeaderField("Location");trace(method+" "+SchoolProtocol.safeEndpoint(url.toString())+" → "+status+" Cookie名["+cookieNames(cookies(url.toString()))+"]"+(location==null?"":" → "+SchoolProtocol.safeEndpoint(new URL(url,location).toString())));}
        if(school&&SchoolProtocol.schoolHost(url.getHost())){
          synchronized(this){if(generation!=schoolGeneration)throw new IOException("学校账号已切换，请重新同步");schoolCookies.put(url.toURI(),c.getHeaderFields());
          for(Map.Entry<String,List<String>> e:c.getHeaderFields().entrySet())if(e.getKey()!=null&&e.getKey().equalsIgnoreCase("Set-Cookie"))for(String value:e.getValue())CookieManager.getInstance().setCookie(url.toString(),value);
          if(issued!=null)acceptIssuedSso(issued.getValue());}
        }
        if(follow&&status>=300&&status<400){
          if(!school)throw new IOException("模型接口发生重定向，请直接填写最终 HTTPS base_url");
          String location=c.getHeaderField("Location");if(location==null)throw new IOException("登录跳转缺少地址");
          URL next=new URL(url,location);if(next.getProtocol().equals("http")&&SchoolProtocol.schoolHost(next.getHost()))next=new URL(next.toString().replaceFirst("^http:","https:"));
          url=next;if(status==303||status==301||status==302){method="GET";body=null;}continue;
        }
        if(school&&url.getHost().equals("zdbk.zju.edu.cn")&&url.getPath().endsWith("/kaptcha")&&status==200){String type=c.getContentType();if(type!=null&&type.startsWith("image/")){byte[] bytes=readBytes(c.getInputStream(),2*1024*1024);return new JSONObject().put("status",status).put("image","data:"+type.split(";")[0]+";base64,"+android.util.Base64.encodeToString(bytes,android.util.Base64.NO_WRAP));}}
        String text=read(status>=400?c.getErrorStream():c.getInputStream(),32*1024*1024);
        JSONObject result=new JSONObject();result.put("status",status);result.put("body",text);result.put("url",school?url.getProtocol()+"://"+url.getHost()+url.getPath():"");if(casPassword)result.put("ssoIssued",issued!=null);if(!follow)result.put("location",c.getHeaderField("Location"));return result;
      } finally {active.remove(id,c);c.disconnect();}
    }
    throw new IOException("登录跳转过多，请重新登录对应学校平台");
  }
  JSONObject school(String id,JSONObject input) throws Exception {
    String module=input.optString("module"),url,method="POST",body="";Map<String,String> headers=new HashMap<>();
    headers.put("Accept","application/json, text/javascript, */*; q=0.01");headers.put("X-Requested-With","XMLHttpRequest");
    headers.put("Referer","https://zdbk.zju.edu.cn/jwglxt/xtgl/index_initMenu.html");headers.put("Content-Type","application/x-www-form-urlencoded; charset=UTF-8");
    switch(module){
      case "grades":url="https://zdbk.zju.edu.cn/jwglxt/cxdy/xscjcx_cxXscjIndex.html?doType=query&queryModel.showCount=5000";break;
      case "major":url="https://zdbk.zju.edu.cn/jwglxt/zycjtj/xszgkc_cxXsZgkcIndex.html?doType=query&queryModel.showCount=5000";break;
      case "exams":int page=input.optInt("page",1);if(page<1||page>20)throw new IOException("考试页码超出范围");url="https://zdbk.zju.edu.cn/jwglxt/xskscx/kscx_cxXsgrksIndex.html?doType=query&queryModel.showCount=5000";body="queryModel.showCount=5000&queryModel.currentPage="+page;break;
      case "captcha":url="https://zdbk.zju.edu.cn/jwglxt/kaptcha?time="+System.currentTimeMillis();method="GET";body=null;break;
      case "courses":
        String year=input.optString("year"),season=input.optString("season");
        if(!year.matches("20[0-9]{2}-20[0-9]{2}")||Integer.parseInt(year.substring(5))!=Integer.parseInt(year.substring(0,4))+1||!Arrays.asList("1|秋","1|冬","2|春","2|夏").contains(season))throw new IOException("请使用完整学年（例如 2026-2027）和有效学期");
        url="https://zdbk.zju.edu.cn/jwglxt/kbcx/xskbcx_cxXsKb.html";
        body="xnm="+URLEncoder.encode(year,"UTF-8")+"&xqm="+URLEncoder.encode(season,"UTF-8")+"&captcha_value="+URLEncoder.encode(input.optString("captcha"),"UTF-8");break;
      case "homework":url="https://courses.zju.edu.cn/api/todos";method="GET";body=null;break;
      case "practice":url="https://sztz.zju.edu.cn/dekt/student/home/getSqjl";method="GET";body=null;break;
      case "practiceSummary":url="https://sztz.zju.edu.cn/dekt/student/home/getMyInfo";method="GET";body=null;break;
      case "calendar":
        String term=input.optString("term");if(!term.matches("20[0-9]{2}-20[0-9]{2}-[12]"))throw new IOException("学期不正确");
        url="http://calendar.celechron.top/"+term+".json";method="GET";body=null;break;
      default:throw new IOException("未知教务模块");
    }
    if(module.startsWith("practice")){headers.clear();headers.put("Accept",module.equals("practice")?"text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8":"application/json, text/plain, */*");headers.put("Cache-Control","no-cache");headers.put("Pragma","no-cache");}
    else if(module.equals("homework")){headers.clear();headers.put("Accept","application/json, text/plain, */*");headers.put("Referer","https://courses.zju.edu.cn/user/index");}
    return request(id,url,method,body,headers,true);
  }
  JSONObject provider(String id,JSONObject input,JSONObject config) throws Exception {
    String base=config.optString("baseUrl").trim().replaceAll("/+$","");URL parsed=new URL(base);
    if(!parsed.getProtocol().equals("https")||parsed.getUserInfo()!=null||parsed.getQuery()!=null||parsed.getRef()!=null)throw new IOException("请填写不含密钥或查询参数的 HTTPS base_url");
    String path=input.optString("path");if(!path.equals("models")&&!path.equals("chat/completions"))throw new IOException("未知模型接口");
    String key=config.optString("apiKey");if(key.isEmpty())throw new IOException("请先填写 API Key");
    Map<String,String> headers=new HashMap<>();headers.put("Authorization","Bearer "+key);headers.put("Content-Type","application/json");headers.put("Accept","application/json");
    JSONObject result=request(id,base+"/"+path,path.equals("models")?"GET":"POST",path.equals("models")?null:input.getJSONObject("body").toString(),headers,false);result.put("body",result.optString("body").replace(key,"[已隐藏密钥]"));return result;
  }
}
