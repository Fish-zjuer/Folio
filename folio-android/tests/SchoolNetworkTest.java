package app.folio.preview;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import org.json.JSONObject;

/** Executes the production Network with scripted HTTPS responses, never a real account/server. */
public final class SchoolNetworkTest {
  private static int checks=0;
  private static final Queue<Reply> replies=new ArrayDeque<>();
  private static void check(boolean value,String label){if(!value)throw new AssertionError(label);checks++;}
  private interface Verify {void run(Connection connection)throws Exception;}
  private static final class Reply {
    final String url,method,body;final int status;final Map<String,List<String>> headers=new LinkedHashMap<>();final Verify verify;
    Reply(String url,String method,int status,String body,Verify verify,String... cookies){this.url=url;this.method=method;this.status=status;this.body=body;this.verify=verify;if(cookies.length>0)headers.put("Set-Cookie",Arrays.asList(cookies));replies.add(this);}
    Reply location(String url){headers.put("Location",Collections.singletonList(url));return this;}
  }
  private static final class Connection extends HttpURLConnection {
    final Reply reply;final ByteArrayOutputStream sent=new ByteArrayOutputStream();boolean responded;
    Connection(URL url){super(url);reply=replies.remove();if(!reply.url.equals(url.toString()))throw new AssertionError("Unexpected endpoint");}
    public void connect(){}public void disconnect(){}public boolean usingProxy(){return false;}
    public OutputStream getOutputStream(){if(responded)throw new AssertionError("Headers read before password body was sent");return sent;}
    public int getResponseCode()throws IOException {if(!responded){responded=true;if(!reply.method.equals(method))throw new AssertionError("Unexpected method");try{if(reply.verify!=null)reply.verify.run(this);}catch(Exception e){throw new IOException(e);}}return reply.status;}
    public Map<String,List<String>> getHeaderFields(){if(!responded)throw new AssertionError("Response headers read before sending request");return reply.headers;}
    public String getHeaderField(String name){List<String> h=reply.headers.get(name);return h==null?null:h.get(0);}
    public InputStream getInputStream(){return new ByteArrayInputStream(reply.body.getBytes(StandardCharsets.UTF_8));}
    public InputStream getErrorStream(){return getInputStream();}
    String body(){return new String(sent.toByteArray(),StandardCharsets.UTF_8);}
    String cookies(){String s=getRequestProperty("Cookie");return s==null?"":s;}
  }
  public static void main(String[] args)throws Exception {
    URL.setURLStreamHandlerFactory(protocol->protocol.equals("https")?new URLStreamHandler(){protected URLConnection openConnection(URL url){return new Connection(url);}}:null);
    Network n=new Network();Map<String,String> h=new HashMap<>();String cas="https://zjuam.zju.edu.cn/cas/login";
    String form="<form id='fm1'><input type='hidden' name='execution' value='flow1'><input type='hidden' name='ys' value='5'></form>";
    new Reply(cas,"GET",200,form,c->check(c.cookies().isEmpty(),"cold start has no browser login"),"JSESSIONID=form-session; Path=/cas; HttpOnly","_csrf=csrf-fixture; Domain=zju.edu.cn; Path=/");
    JSONObject page=n.request("flow",cas,"GET",null,h,true,false);
    new Reply("https://zjuam.zju.edu.cn/cas/v2/getPubKey","GET",200,"{}",c->check(c.cookies().contains("JSESSIONID=form-session")&&c.cookies().contains("_csrf=csrf-fixture"),"public key uses the same form cookies"),"JSESSIONID=rotated-session; Path=/cas; HttpOnly");
    n.request("flow","https://zjuam.zju.edu.cn/cas/v2/getPubKey","GET",null,h,true,false);
    String body=SchoolProtocol.loginForm(page.optString("body"),"fixture-user","encrypted-fixture");
    new Reply(cas,"POST",302,"",c->{check(c.cookies().contains("JSESSIONID=rotated-session")&&c.cookies().contains("_csrf=csrf-fixture"),"password submit retains rotated session and csrf");check(c.body().contains("ys=5")&&c.body().contains("execution=flow1")&&c.body().contains("password=encrypted-fixture"),"complete form is actually written before response headers");},"iPlanetDirectoryPro=fresh-fixture; Path=/cas; Secure","iPlanetDirectoryPro=; Path=/; Max-Age=0").location("/cas/login");
    JSONObject result=n.request("flow",cas,"POST",body,h,true,false);
    check(result.optBoolean("ssoIssued"),"password response provides a fresh SSO proof");
    check(n.hasCookie("https://identity.zju.edu.cn/","iPlanetDirectoryPro"),"new SSO is immediately available to other business hosts without browser");
    String service="https://zdbk.zju.edu.cn/jwglxt/xtgl/login_ssologin.html",ticket=service+"?ticket=one-use-fixture",serviceRequest=cas+"?service="+URLEncoder.encode(service,"UTF-8");
    new Reply(serviceRequest,"GET",302,"",c->check(c.cookies().contains("iPlanetDirectoryPro=fresh-fixture"),"CAS service exchange uses fresh SSO")).location(ticket);
    n.request("flow",serviceRequest,"GET",null,h,true,false);
    new Reply(ticket,"GET",302,"",null,"JSESSIONID=business-fixture; Path=/jwglxt; HttpOnly","route=node-fixture; Path=/jwglxt").location("/jwglxt/xtgl/index_initMenu.html");
    JSONObject callback=n.request("flow",ticket,"GET",null,h,true,false);
    check(SchoolProtocol.businessCallbackAccepted(callback.optInt("status"),callback.optString("body"))&&n.hasCookie(service,"JSESSIONID")&&n.hasCookie(service,"route"),"callback redirect already establishes academic business session");
    String grades="https://zdbk.zju.edu.cn/jwglxt/cxdy/xscjcx_cxXscjIndex.html?doType=query&queryModel.showCount=5000";
    new Reply(grades,"POST",200,"{\"items\":[]}",c->check(c.cookies().contains("JSESSIONID=business-fixture")&&c.cookies().contains("route=node-fixture")&&!c.cookies().contains("form-session"),"first data request carries the business cookie pair, not CAS session"));
    check(n.school("flow",new JSONObject().put("module","grades")).optInt("status")==200,"first data request succeeds without an official web view");
    new Reply(cas,"POST",200,"login failed",null,"iPlanetDirectoryPro=; Max-Age=0; Path=/");
    check(!n.request("fail",cas,"POST","fixture",h,true,false).optBoolean("ssoIssued"),"old SSO cannot make a rejected password response successful");
    String diagnostics=n.diagnostics().toString();check(!diagnostics.contains("one-use-fixture")&&!diagnostics.contains("fresh-fixture")&&!diagnostics.contains("encrypted-fixture")&&!diagnostics.contains("fixture-user"),"diagnostics omit credentials, cookie values and tickets");
    check(replies.isEmpty(),"all scripted requests were consumed exactly once");
    // Execute the actual SchoolSession recovery branch. Browser stays empty; no password is read.
    new Reply(cas,"POST",302,"",null,"iPlanetDirectoryPro=recovery-fixture; Domain=zju.edu.cn; Path=/");
    n.request("seed",cas,"POST","encrypted-fixture",h,true,false);
    Vault vault=new Vault();SchoolSession session=new SchoolSession(n,vault);java.lang.reflect.Field lifetime=SchoolSession.class.getDeclaredField("ssoUntil");lifetime.setAccessible(true);lifetime.setLong(session,System.currentTimeMillis()+120000);
    new Reply(grades,"POST",901,"",null);new Reply(grades,"POST",901,"",null);
    String repaired=service+"?ticket=repair-fixture";
    new Reply(serviceRequest,"GET",302,"",c->check(c.cookies().contains("iPlanetDirectoryPro=recovery-fixture"),"HTTP 901 exchanges a business session with existing valid SSO")).location(repaired);
    new Reply(repaired,"GET",302,"",null,"JSESSIONID=repaired-fixture; Path=/jwglxt","route=repaired-node; Path=/jwglxt");
    new Reply(grades,"POST",200,"{}",null);
    check(session.school("recover",new JSONObject().put("module","grades")).optInt("status")==200,"actual SchoolSession recovers HTTP 901 and returns fresh data");
    check(vault.reads==0,"business recovery does not unnecessarily submit stored password");
    check(replies.isEmpty(),"HTTP 901 performs one bounded business rebuild");
    new Reply(grades,"POST",901,"",null);new Reply(grades,"POST",901,"",null);
    new Reply(serviceRequest,"GET",302,"",null).location(repaired);
    new Reply(repaired,"GET",302,"",null,"JSESSIONID=still-rejected; Path=/jwglxt","route=repaired-node; Path=/jwglxt");
    new Reply(grades,"POST",901,"",null);
    try{session.school("reject",new JSONObject().put("module","grades"));throw new AssertionError("Repeated 901 was accepted");}catch(IOException expected){check(expected.getMessage().contains("HTTP 901"),"persistent HTTP 901 preserves a diagnostic error after one rebuild");}
    check(replies.isEmpty(),"persistent rejection stops instead of looping login");
    String exams="https://zdbk.zju.edu.cn/jwglxt/xskscx/kscx_cxXsgrksIndex.html?doType=query&queryModel.showCount=5000";
    new Reply(exams,"POST",200,"{}",c->{check(c.body().isEmpty(),"exam first page keeps the established empty POST");check(c.cookies().contains("JSESSIONID=still-rejected")&&c.cookies().contains("route=repaired-node"),"exams reuse the academic browser/native cookie pair");});
    check(session.school("exams-first",new JSONObject().put("module","exams").put("page",1)).optInt("status")==200,"exams accept the existing academic login without resubmitting credentials");
    new Reply(exams+"&queryModel.currentPage=2","POST",200,"{}",c->check(c.body().isEmpty(),"subsequent exam page puts pagination in URL, not POST form"));
    check(session.school("exams-next",new JSONObject().put("module","exams").put("page",2)).optInt("status")==200,"exam second page uses its requested page");
    String html="<html><h1>Service unavailable</h1></html>";
    new Reply(exams,"POST",200,html,null);
    check(session.school("exams-error-page",new JSONObject().put("module","exams")).optString("body").equals(html),"non-authentication HTML is passed to format validation instead of repeated login");
    new Reply(exams,"POST",302,"",null).location(cas);
    new Reply(exams,"POST",302,"",null).location(cas);
    new Reply(serviceRequest,"GET",302,"",null).location(repaired);
    new Reply(repaired,"GET",302,"",null,"JSESSIONID=exam-repaired; Path=/jwglxt","route=repaired-node; Path=/jwglxt");
    new Reply(exams,"POST",200,"{}",null);
    check(session.school("exams-login-redirect",new JSONObject().put("module","exams")).optInt("status")==200,"exam authentication redirect is recovered once without following a login webpage");
    check(vault.reads==0,"exam recovery reuses valid SSO and never requests password for each page");
    check(replies.isEmpty(),"exam transport and HTML cases consume exactly the expected requests");
    System.out.println("PASS "+checks+" offline school network checks");
  }
}
