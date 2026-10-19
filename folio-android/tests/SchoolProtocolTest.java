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
    System.out.println("PASS "+checks+" offline native school protocol checks");
  }
}
