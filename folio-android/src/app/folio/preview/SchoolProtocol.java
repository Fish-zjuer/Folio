package app.folio.preview;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.util.regex.*;
import java.net.URL;

/** CAS protocol adapted from Celechron zjuam.dart (GPL-3.0). No credentials are logged. */
final class SchoolProtocol {
  private static String attribute(String tag,String name){
    Matcher m=Pattern.compile("(?:^|\\s)"+Pattern.quote(name)+"\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))",Pattern.CASE_INSENSITIVE).matcher(tag);
    if(!m.find())return "";String value=m.group(1)!=null?m.group(1):m.group(2)!=null?m.group(2):m.group(3);
    return value.replace("&quot;","\"").replace("&#39;","'").replace("&lt;","<").replace("&gt;",">").replace("&amp;","&");
  }
  /** Preserve the server's CAS hidden fields instead of reconstructing an older form. */
  static String loginForm(String html,String username,String encrypted) throws Exception {
    String login=null;Matcher forms=Pattern.compile("<form\\b[^>]*>([\\s\\S]*?)</form\\s*>",Pattern.CASE_INSENSITIVE).matcher(html);
    while(forms.find()){String candidate=forms.group(1);try{execution(candidate);login=candidate;break;}catch(Exception ignored){}}
    if(login==null)throw new Exception("学校登录页发生变化，未取得认证表单；可使用官方网页登录");
    java.util.Map<String,String> fields=new java.util.LinkedHashMap<>();Matcher tags=Pattern.compile("<input\\b[^>]*>",Pattern.CASE_INSENSITIVE).matcher(login);
    while(tags.find()){String tag=tags.group(),name=attribute(tag,"name");if(attribute(tag,"type").equalsIgnoreCase("hidden")&&name.matches("[A-Za-z_][A-Za-z0-9_.-]{0,63}")&&fields.size()<32)fields.put(name,attribute(tag,"value"));}
    fields.put("execution",execution(login));fields.put("_eventId","submit");fields.put("username",username);fields.put("password",encrypted);fields.put("rememberMe","true");fields.put("authcode","");
    StringBuilder out=new StringBuilder();for(java.util.Map.Entry<String,String> field:fields.entrySet()){if(out.length()>0)out.append('&');out.append(java.net.URLEncoder.encode(field.getKey(),"UTF-8")).append('=').append(java.net.URLEncoder.encode(field.getValue(),"UTF-8"));}return out.toString();
  }
  /** A delete-cookie followed by a live cookie must not be mistaken for a failed password login. */
  static java.net.HttpCookie issuedSso(java.util.Map<String,java.util.List<String>> headers){
    java.net.HttpCookie found=null;for(java.util.Map.Entry<String,java.util.List<String>> header:headers.entrySet())if(header.getKey()!=null&&header.getKey().equalsIgnoreCase("Set-Cookie"))for(String raw:header.getValue())try{
      for(java.net.HttpCookie c:java.net.HttpCookie.parse(raw))if(c.getName().equals("iPlanetDirectoryPro")&&!c.getValue().isEmpty()&&!c.hasExpired()&&c.getMaxAge()!=0)found=c;
    }catch(IllegalArgumentException ignored){}return found;
  }
  static boolean businessCallbackAccepted(int status,String body){return status>=200&&status<400&&!authBody(body);}
  // ZDBK uses HTTP 901 as well as JSON code=901 to reject an authenticated session.
  static boolean authStatus(int status){return status==401||status==403||status==901;}
  static String loginFailure(String body){
    // The normal login form itself always contains captcha markup; only inspect actual error messages.
    Matcher errors=Pattern.compile("<(?:p|div|span)\\b[^>]*(?:class\\s*=\\s*['\"][^'\"]*\\berror\\b[^'\"]*['\"]|id\\s*=\\s*['\"]msg['\"])[^>]*>([\\s\\S]*?)</(?:p|div|span)>",Pattern.CASE_INSENSITIVE).matcher(body);
    StringBuilder text=new StringBuilder();while(errors.find())text.append(errors.group(1).replaceAll("<[^>]+>"," "));
    if(text.toString().matches("[\\s\\S]*(?:验证码|额外认证|二次认证|动态码|扫码)[\\s\\S]*"))return "学校要求验证码／额外认证，请使用官方网页登录完成";
    return "统一身份认证未完成，请检查学号和密码；如学校要求额外认证，请使用官方网页登录";
  }
  static String execution(String html) throws Exception {
    Matcher tags=Pattern.compile("<input\\b[^>]*>",Pattern.CASE_INSENSITIVE).matcher(html);
    while(tags.find()){
      String tag=tags.group();
      if(Pattern.compile("\\bname\\s*=\\s*['\"]execution['\"]",Pattern.CASE_INSENSITIVE).matcher(tag).find()){
        Matcher value=Pattern.compile("\\bvalue\\s*=\\s*(['\"])(.*?)\\1",Pattern.CASE_INSENSITIVE).matcher(tag);
        if(value.find()&&!value.group(2).isEmpty())return value.group(2).replace("&amp;","&").replace("&quot;","\"").replace("&#39;","'");
      }
    }
    throw new Exception("学校登录页发生变化，未取得认证表单；可使用官方网页登录");
  }
  static String encryptPassword(String password,String modulus,String exponent) throws Exception {
    if(password==null||password.isEmpty()||password.length()>512||!modulus.matches("[0-9a-fA-F]{64,2048}")||!exponent.matches("[0-9a-fA-F]{1,16}"))throw new Exception("认证密码或公钥格式不正确");
    BigInteger n=new BigInteger(modulus,16),e=new BigInteger(exponent,16),p=new BigInteger(1,password.getBytes(StandardCharsets.UTF_8));
    if(p.compareTo(n)>=0||e.signum()<=0)throw new Exception("认证密码或公钥格式不正确");
    String encrypted=p.modPow(e,n).toString(16);StringBuilder out=new StringBuilder();
    for(int i=encrypted.length();i<128;i++)out.append('0');return out.append(encrypted).toString();
  }
  static boolean schoolHost(String host){return host!=null&&(host.equals("zju.edu.cn")||host.endsWith(".zju.edu.cn"));}
  static String metaRefresh(String html,String current) throws Exception {
    Matcher tags=Pattern.compile("<meta\\b[^>]*>",Pattern.CASE_INSENSITIVE).matcher(html);
    while(tags.find()){
      String tag=tags.group();if(!Pattern.compile("http-equiv\\s*=\\s*['\"]?refresh",Pattern.CASE_INSENSITIVE).matcher(tag).find())continue;
      Matcher target=Pattern.compile("url\\s*=\\s*['\"]?([^'\" >;]+)",Pattern.CASE_INSENSITIVE).matcher(tag);
      if(target.find()){URL url=new URL(new URL(current),target.group(1).replace("&amp;","&"));if(!url.getProtocol().equals("https")||!schoolHost(url.getHost()))throw new Exception("学校登录跳转地址不正确");return url.toString();}
    }return null;
  }
  static boolean authBody(String body){
    String s=body.trim().toLowerCase(java.util.Locale.ROOT);
    // Successful JSON may contain course titles and links mentioning login. Inspect JSON status in SchoolSession instead.
    if(s.startsWith("{")||s.startsWith("["))return false;
    boolean password=Pattern.compile("<input\\b[^>]*(?:type|name)\\s*=\\s*['\"]?password",Pattern.CASE_INSENSITIVE).matcher(s).find();
    boolean redirect=s.contains("zjuam.zju.edu.cn/cas/login")&&(s.contains("location")||s.contains("http-equiv"));
    return redirect||password&&(s.contains("execution")||s.contains("username")||s.contains("cas/login"))||s.equals("请先登录")||s.equals("未登录")||s.equals("登录已失效")||s.equals("unauthorized");
  }
  static boolean authEndpoint(String address){try{URL u=new URL(address);return u.getHost().equals("identity.zju.edu.cn")||u.getHost().equals("zjuam.zju.edu.cn")&&u.getPath().startsWith("/cas/login");}catch(Exception e){return false;}}
  static String safeEndpoint(String address){try{URL u=new URL(address);return u.getHost()+u.getPath().replaceAll("[A-Za-z0-9_-]{24,}","[omitted]");}catch(Exception e){return "unknown";}}
  static boolean cookieDomainAllowed(java.net.URI target,java.net.HttpCookie cookie){
    String domain=cookie.getDomain(),host=target.getHost();if(domain==null||host==null)return false;domain=domain.toLowerCase(java.util.Locale.ROOT).replaceFirst("^\\.","");host=host.toLowerCase(java.util.Locale.ROOT);
    return schoolHost(domain)&&(host.equals(domain)||host.endsWith("."+domain));
  }
  static java.net.HttpCookie rootSsoCookie(String value){java.net.HttpCookie c=new java.net.HttpCookie("iPlanetDirectoryPro",value);c.setDomain("zju.edu.cn");c.setPath("/");c.setSecure(true);return c;}
  static boolean cookieMatches(java.net.HttpCookie cookie,java.net.URI target){
    if(cookie.hasExpired()||cookie.getSecure()&&!"https".equalsIgnoreCase(target.getScheme()))return false;
    String domain=cookie.getDomain(),host=target.getHost(),path=cookie.getPath(),requested=target.getPath();
    if(domain==null||domain.isEmpty())return false;
    if(domain!=null){domain=domain.toLowerCase(java.util.Locale.ROOT).replaceFirst("^\\.","");if(!host.equalsIgnoreCase(domain)&&!host.toLowerCase(java.util.Locale.ROOT).endsWith("."+domain))return false;}
    if(path==null||path.isEmpty())path="/";if(requested==null||requested.isEmpty())requested="/";
    return requested.equals(path)||requested.startsWith(path)&&(path.endsWith("/")||requested.length()>path.length()&&requested.charAt(path.length())=='/');
  }
}
