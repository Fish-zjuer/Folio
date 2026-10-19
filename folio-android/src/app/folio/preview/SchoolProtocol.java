package app.folio.preview;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.util.regex.*;
import java.net.URL;

/** CAS protocol adapted from Celechron zjuam.dart (GPL-3.0). No credentials are logged. */
final class SchoolProtocol {
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
    return password&&(s.contains("execution")||s.contains("username")||s.contains("cas/login"))||s.equals("请先登录")||s.equals("未登录")||s.equals("登录已失效")||s.equals("unauthorized");
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
