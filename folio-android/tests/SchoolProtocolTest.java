package app.folio.preview;

/** Offline protocol cases; no account, password or school service is contacted. */
public final class SchoolProtocolTest {
  private static int checks=0;
  private static void check(boolean ok,String name){if(!ok)throw new AssertionError(name);checks++;}
  public static void main(String[] args) throws Exception {
    check(SchoolProtocol.execution("<input value='e1s1&amp;x' type='hidden' name='execution'>").equals("e1s1&x"),"CAS execution attribute order and entity decoding");
    check(SchoolProtocol.execution("<INPUT NAME=\"execution\" VALUE=\"e2s2\">").equals("e2s2"),"CAS uppercase attributes");
    try{SchoolProtocol.execution("<input name='username'>");throw new AssertionError("missing execution accepted");}catch(AssertionError e){throw e;}catch(Exception expected){checks++;}
    String modulus="ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
    String encrypted=SchoolProtocol.encryptPassword("abc",modulus,"01");check(encrypted.length()==128&&encrypted.endsWith("616263"),"CAS raw RSA keeps UTF-8 bytes and fixed width");
    try{SchoolProtocol.encryptPassword("abc","invalid","01");throw new AssertionError("bad key accepted");}catch(AssertionError e){throw e;}catch(Exception expected){checks++;}
    check(SchoolProtocol.schoolHost("courses.zju.edu.cn")&&!SchoolProtocol.schoolHost("zju.edu.cn.example.com"),"trusted hosts reject suffix lookalikes");
    check(SchoolProtocol.metaRefresh("<meta http-equiv='refresh' content='0; url=/welcome'>","https://courses.zju.edu.cn/login").equals("https://courses.zju.edu.cn/welcome"),"business meta redirect");
    try{SchoolProtocol.metaRefresh("<meta http-equiv='refresh' content='0; url=https://example.com/login'>","https://courses.zju.edu.cn/login");throw new AssertionError("external redirect accepted");}catch(AssertionError e){throw e;}catch(Exception expected){checks++;}
    check(SchoolProtocol.authBody("请先登录")&&!SchoolProtocol.authBody("{\"items\":[]}"),"expired session detection");
    check(!SchoolProtocol.authBody("<a href='/cas/login'>统一身份认证</a><main>课程首页</main>"),"login links are not logged-out pages");
    check(!SchoolProtocol.authBody("{\"todo_list\":[{\"title\":\"未登录处理 / cas/login\"}]}"),"JSON data cannot trigger HTML login detection");
    check(SchoolProtocol.authBody("<form><input name='username'><input type='password'><input name='execution'></form>"),"actual login form is expired");
    java.net.HttpCookie c=new java.net.HttpCookie("session","example");c.setDomain("courses.zju.edu.cn");c.setPath("/user");c.setSecure(true);
    check(!SchoolProtocol.cookieMatches(c,new java.net.URI("https://courses.zju.edu.cn/api/todos"))&&SchoolProtocol.cookieMatches(c,new java.net.URI("https://courses.zju.edu.cn/user/index")),"cookie path is respected");
    check(!SchoolProtocol.cookieMatches(c,new java.net.URI("https://courses.zju.edu.cn/users"))&&!SchoolProtocol.cookieMatches(c,new java.net.URI("http://courses.zju.edu.cn/user")),"cookie boundary and secure flag");
    check(SchoolProtocol.authEndpoint("https://zjuam.zju.edu.cn/cas/login?service=x")&&!SchoolProtocol.authEndpoint("https://courses.zju.edu.cn/user/index"),"final auth endpoint detection");
    java.net.CookieManager jar=new java.net.CookieManager(null,SchoolProtocol::cookieDomainAllowed);java.net.URI cas=new java.net.URI("https://zjuam.zju.edu.cn/cas/login");
    jar.put(cas,java.util.Collections.singletonMap("Set-Cookie",java.util.Arrays.asList("iPlanetDirectoryPro=fixture; Domain=zju.edu.cn; Secure")));
    check(jar.getCookieStore().getCookies().size()==1,"school parent domain without leading dot is accepted");
    java.net.HttpCookie scoped=jar.getCookieStore().getCookies().get(0);check(SchoolProtocol.cookieMatches(scoped,cas)&&!SchoolProtocol.cookieMatches(scoped,new java.net.URI("https://zjuam.zju.edu.cn/")),"CAS cookie is inspected on its actual path before promoting");
    java.net.HttpCookie root=SchoolProtocol.rootSsoCookie("fixture");check(SchoolProtocol.cookieMatches(root,new java.net.URI("https://courses.zju.edu.cn/api/todos"))&&SchoolProtocol.cookieMatches(root,new java.net.URI("https://identity.zju.edu.cn/")),"promoted SSO is available to school business sites");
    check(!SchoolProtocol.cookieDomainAllowed(new java.net.URI("https://courses.zju.edu.cn/"),new java.net.HttpCookie("session","x"))&&!SchoolProtocol.cookieMatches(root,new java.net.URI("https://zju.edu.cn.example.com/")),"missing domain and lookalikes rejected");
    check(SchoolProtocol.safeEndpoint("https://zjuam.zju.edu.cn/cas/login?ticket=secret&username=private").equals("zjuam.zju.edu.cn/cas/login"),"diagnostic endpoints exclude query secrets");
    String html="<form><input type='hidden' name='unrelated' value='skip'></form><form id='fm1'><input type='hidden' name='execution' value='e1&amp;x'><input type='hidden' name='ys' value='5'><input type='hidden' name='_csrf' value='a+b&amp;c'><input type='hidden' name='_eventId' value='wrong'><input name='username' value='old'></form>";
    java.util.Map<String,String> form=new java.util.HashMap<>();for(String pair:SchoolProtocol.loginForm(html,"fixture+user","abc=+").split("&")){String[] kv=pair.split("=",2);form.put(java.net.URLDecoder.decode(kv[0],"UTF-8"),java.net.URLDecoder.decode(kv[1],"UTF-8"));}
    check(form.get("ys").equals("5")&&form.get("_csrf").equals("a+b&c")&&form.get("execution").equals("e1&x")&&!form.containsKey("unrelated"),"fresh hidden fields stay in the correct CAS form");
    check(form.get("username").equals("fixture+user")&&form.get("password").equals("abc=+")&&form.get("_eventId").equals("submit")&&form.get("authcode").equals(""),"credentials are encoded once and authoritative submit fields override page values");
    try{SchoolProtocol.loginForm("<form><input name='username'></form>","fixture","encrypted");throw new AssertionError("missing form accepted");}catch(AssertionError e){throw e;}catch(Exception expected){checks++;}
    check(SchoolProtocol.businessCallbackAccepted(302,"")&&SchoolProtocol.businessCallbackAccepted(200,"<main>Home</main>"),"academic session cookie may arrive on the callback redirect");
    check(!SchoolProtocol.businessCallbackAccepted(403,"")&&!SchoolProtocol.businessCallbackAccepted(200,"<input name='username'><input type='password'>"),"error or login page cannot count as established business session");
    java.util.Map<String,java.util.List<String>> cookies=new java.util.HashMap<>();cookies.put("set-cookie",java.util.Arrays.asList("iPlanetDirectoryPro=; Max-Age=0; Path=/","iPlanetDirectoryPro=fresh; Domain=zju.edu.cn; Path=/"));
    check(SchoolProtocol.issuedSso(cookies)!=null&&SchoolProtocol.issuedSso(cookies).getValue().equals("fresh"),"accept live SSO from the current response rather than deletion cookie");
    java.util.Collections.reverse(cookies.get("set-cookie"));check(SchoolProtocol.issuedSso(cookies).getValue().equals("fresh"),"header list reversal cannot let a deletion hide the fresh SSO");
    cookies.put("set-cookie",java.util.Arrays.asList("iPlanetDirectoryPro=; Max-Age=0","JSESSIONID=fixture"));check(SchoolProtocol.issuedSso(cookies)==null,"old browser SSO cannot turn a failed password response into success");
    check(SchoolProtocol.loginFailure("<input name='authcode'><p class='error'>密码错误</p>").startsWith("统一身份认证未完成"),"normal captcha markup is not evidence of a captcha challenge");
    check(SchoolProtocol.loginFailure("<p class='error text-danger'>验证码错误</p>").startsWith("学校要求验证码"),"actual captcha error uses official browser fallback");
    check(SchoolProtocol.authStatus(901),"HTTP 901 must enter session recovery even with an empty or non-JSON body");
    check(SchoolProtocol.authStatus(401)&&SchoolProtocol.authStatus(403),"standard unauthorized/forbidden statuses retain recovery");
    check(!SchoolProtocol.authStatus(200)&&!SchoolProtocol.authStatus(429)&&!SchoolProtocol.authStatus(500),"success, rate limits and server failures do not trigger password login");
    System.out.println("PASS "+checks+" offline native school protocol checks");
  }
}
