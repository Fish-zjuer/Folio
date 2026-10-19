package app.folio.preview;

import android.app.*;
import android.os.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.provider.MediaStore;
import android.view.*;
import android.webkit.*;
import android.widget.*;
import org.json.*;
import java.io.*;
import java.util.*;
import java.util.concurrent.*;

public final class MainActivity extends Activity {
  private static final String HOST="appassets.androidplatform.net",START="https://"+HOST+"/assets/index.html";
  private WebView web;private Vault vault;private SchoolSession schoolSession;private final Network network=new Network();private android.animation.ValueAnimator chromeAnimator;
  private final ExecutorService jobs=Executors.newFixedThreadPool(5);
  private volatile boolean trusted=false;private ValueCallback<Uri[]> fileCallback;private Uri cameraOutput;
  private Dialog loginDialog;private WebView loginView;
  private volatile boolean resumed=false;private boolean pageReady=false,notificationPermissionPending=false;private JSONObject pendingNotification;private String pendingGradeId="";
  private static final String GRADE_CHANNEL="folio-new-grades",GRADE_EXTRA="folio.gradeId";
  public void onCreate(Bundle state){
    super.onCreate(state);vault=new Vault(this);schoolSession=new SchoolSession(network,vault);pendingGradeId=getIntent().getStringExtra(GRADE_EXTRA);if(pendingGradeId==null)pendingGradeId="";
    String colorMode=getPreferences(MODE_PRIVATE).getString("colorMode","system");boolean dark=colorMode.equals("dark")||colorMode.equals("system")&&(getResources().getConfiguration().uiMode&android.content.res.Configuration.UI_MODE_NIGHT_MASK)==android.content.res.Configuration.UI_MODE_NIGHT_YES;int canvas=dark?Color.rgb(36,37,33):Color.rgb(249,249,247);
    getWindow().setStatusBarColor(canvas);getWindow().setNavigationBarColor(canvas);getWindow().getDecorView().setBackgroundColor(canvas);if(Build.VERSION.SDK_INT>=29)getWindow().setNavigationBarContrastEnforced(false);
    getWindow().getDecorView().setSystemUiVisibility(dark?0:View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR|View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);
    web=new WebView(this);web.setBackgroundColor(canvas);
    WebSettings settings=web.getSettings();settings.setTextZoom(100);settings.setJavaScriptEnabled(true);settings.setDomStorageEnabled(true);settings.setAllowFileAccess(false);settings.setAllowContentAccess(false);settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);settings.setSafeBrowsingEnabled(true);
    web.addJavascriptInterface(new Bridge(),"FolioAndroid");
    web.setWebViewClient(new WebViewClient(){
      public void onPageStarted(WebView view,String url,android.graphics.Bitmap icon){trusted=url.startsWith("https://"+HOST+"/assets/");pageReady=false;}
      public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){
        Uri uri=request.getUrl();if(HOST.equals(uri.getHost())&&"https".equals(uri.getScheme()))return false;
        if(request.isForMainFrame())openExternal(uri);return true;
      }
      public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
        Uri uri=request.getUrl();
        if(!HOST.equals(uri.getHost())||!"https".equals(uri.getScheme()))return response("text/plain",403,"Blocked");
        String path=uri.getPath();if(path==null||!path.startsWith("/assets/")||path.contains("..")||path.contains("\\"))return response("text/plain",404,"Not found");
        try{
          String asset=path.substring(8);String mime=mime(asset);
          Map<String,String> headers=new HashMap<>();headers.put("Cache-Control","no-cache");headers.put("X-Content-Type-Options","nosniff");
          headers.put("Content-Security-Policy","default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'");
          return new WebResourceResponse(mime,"UTF-8",200,"OK",headers,getAssets().open("www/"+asset));
        }catch(IOException e){return response("text/plain",404,"Not found");}
      }
      public void onPageFinished(WebView view,String url){if(trusted){pageReady=true;view.evaluateJavascript("window.dispatchEvent(new Event('folio-native-ready'))",null);deliverGrade();}}
    });
    web.setWebChromeClient(new WebChromeClient(){
      public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){chooseFile(callback,params);return true;}
      public boolean onCreateWindow(WebView view,boolean dialog,boolean userGesture,Message result){
        WebView temp=new WebView(MainActivity.this);temp.setWebViewClient(new WebViewClient(){public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){openExternal(r.getUrl());v.destroy();return true;}});
        ((WebView.WebViewTransport)result.obj).setWebView(temp);result.sendToTarget();return true;
      }
    });
    settings.setSupportMultipleWindows(true);setContentView(web);web.loadUrl(START);
    if(Build.VERSION.SDK_INT>=33)getOnBackInvokedDispatcher().registerOnBackInvokedCallback(android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT,()->handleBack());
  }
  private static String mime(String path){if(path.endsWith(".js"))return "text/javascript";if(path.endsWith(".css"))return "text/css";if(path.endsWith(".html"))return "text/html";if(path.endsWith(".woff2"))return "font/woff2";if(path.endsWith(".svg"))return "image/svg+xml";return "text/plain";}
  private static WebResourceResponse response(String type,int status,String message){return new WebResourceResponse(type,"UTF-8",status,message,Collections.emptyMap(),new ByteArrayInputStream(message.getBytes(java.nio.charset.StandardCharsets.UTF_8)));}
  private void openExternal(Uri uri){if(!Arrays.asList("https","http","mailto").contains(uri.getScheme()))return;try{startActivity(new Intent(Intent.ACTION_VIEW,uri));}catch(ActivityNotFoundException e){Toast.makeText(this,"没有可以打开链接的应用",Toast.LENGTH_SHORT).show();}}
  private void chooseFile(ValueCallback<Uri[]> callback,WebChromeClient.FileChooserParams params){
    if(fileCallback!=null)fileCallback.onReceiveValue(null);fileCallback=callback;cameraOutput=null;
    String type="*/*";if(params.getAcceptTypes().length>0&&!params.getAcceptTypes()[0].isEmpty())type=params.getAcceptTypes()[0];
    boolean image=type.startsWith("image"),multiple=params.getMode()==WebChromeClient.FileChooserParams.MODE_OPEN_MULTIPLE;
    Intent pick;
    if(image&&Build.VERSION.SDK_INT>=33){pick=new Intent(MediaStore.ACTION_PICK_IMAGES);pick.setType("image/*");if(multiple)pick.putExtra(MediaStore.EXTRA_PICK_IMAGES_MAX,Math.min(10,MediaStore.getPickImagesMaxLimit()));}
    else if(image){pick=new Intent(Intent.ACTION_GET_CONTENT);pick.setType("image/*");pick.addCategory(Intent.CATEGORY_OPENABLE);pick.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,multiple);}
    else{pick=new Intent(Intent.ACTION_OPEN_DOCUMENT);pick.addCategory(Intent.CATEGORY_OPENABLE);pick.setType(type);pick.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,multiple);}
    Intent camera=null;
    if(type.startsWith("image")&&params.isCaptureEnabled())try{
      File file=File.createTempFile("capture-",".jpg",getCacheDir());cameraOutput=Uri.parse("content://app.folio.preview.capture/"+file.getName());
      camera=new Intent(MediaStore.ACTION_IMAGE_CAPTURE);camera.putExtra(MediaStore.EXTRA_OUTPUT,cameraOutput);camera.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION|Intent.FLAG_GRANT_READ_URI_PERMISSION);camera.setClipData(ClipData.newRawUri("photo",cameraOutput));
      if(camera.resolveActivity(getPackageManager())==null)camera=null;
    }catch(IOException ignored){}
    if(params.isCaptureEnabled()&&camera==null){fileCallback.onReceiveValue(null);fileCallback=null;Toast.makeText(this,"没有可用的相机应用",Toast.LENGTH_SHORT).show();return;}
    try{if(params.isCaptureEnabled())startActivityForResult(camera,100);else if(image)startActivityForResult(pick,100);else startActivityForResult(Intent.createChooser(pick,"选择文件"),100);}
    catch(ActivityNotFoundException e){fileCallback.onReceiveValue(null);fileCallback=null;}
  }
  protected void onActivityResult(int request,int result,Intent data){super.onActivityResult(request,result,data);if(request!=100||fileCallback==null)return;
    Uri[] values=null;if(result==RESULT_OK){if(data!=null&&data.getClipData()!=null){ClipData clip=data.getClipData();values=new Uri[clip.getItemCount()];for(int i=0;i<values.length;i++)values[i]=clip.getItemAt(i).getUri();}else if(data!=null&&data.getData()!=null)values=new Uri[]{data.getData()};else if(cameraOutput!=null)values=new Uri[]{cameraOutput};}
    fileCallback.onReceiveValue(values);fileCallback=null;cameraOutput=null;
  }
  private void schoolLogin(String site){
    if(loginDialog!=null&&loginDialog.isShowing())return;
    String target=site.equals("homework")?"https://courses.zju.edu.cn/":site.equals("practice")?"https://sztz.zju.edu.cn/dekt/":"https://zjuam.zju.edu.cn/cas/login?service=https%3A%2F%2Fzdbk.zju.edu.cn%2Fjwglxt%2Fxtgl%2Flogin_ssologin.html";
    loginDialog=new Dialog(this,android.R.style.Theme_Material_Light_NoActionBar);LinearLayout layout=new LinearLayout(this);layout.setOrientation(LinearLayout.VERTICAL);
    Button done=new Button(this);done.setText("完成登录，返回 Folio");done.setOnClickListener(v->loginDialog.dismiss());layout.addView(done);
    loginView=new WebView(this);loginView.getSettings().setJavaScriptEnabled(true);loginView.getSettings().setDomStorageEnabled(true);loginView.getSettings().setAllowFileAccess(false);loginView.getSettings().setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    loginView.setWebViewClient(new WebViewClient(){public boolean shouldOverrideUrlLoading(WebView v,WebResourceRequest r){Uri u=r.getUrl();return !"https".equals(u.getScheme())||!(u.getHost()!=null&&(u.getHost().equals("zju.edu.cn")||u.getHost().endsWith(".zju.edu.cn")));}});
    layout.addView(loginView,new LinearLayout.LayoutParams(-1,0,1));loginDialog.setContentView(layout);loginDialog.getWindow().setLayout(-1,-1);
    loginDialog.setOnDismissListener(d->{CookieManager.getInstance().flush();network.browserLoginCompleted();schoolSession.browserLoginCompleted();loginView.destroy();loginView=null;web.evaluateJavascript("window.dispatchEvent(new Event('folio-school-login'))",null);});loginDialog.show();loginDialog.getWindow().setLayout(-1,-1);loginView.loadUrl(target);
  }
  private void reply(String id,JSONObject value){runOnUiThread(()->{if(trusted&&!isFinishing())web.evaluateJavascript("window.FolioNative&&window.FolioNative.receive("+JSONObject.quote(id)+","+value.toString()+")",null);});}
  private JSONObject publicConfig(JSONObject config) throws JSONException {JSONObject result=new JSONObject(config.toString());result.remove("apiKey");result.put("hasKey",!config.optString("apiKey").isEmpty());return result;}
  private void clearSchoolCookies() throws Exception {network.resetSchoolCookies();CountDownLatch cleared=new CountDownLatch(1);runOnUiThread(()->CookieManager.getInstance().removeAllCookies(value->{CookieManager.getInstance().flush();cleared.countDown();}));if(!cleared.await(5,TimeUnit.SECONDS))throw new IOException("旧登录会话未清理完成，请稍后重试");}
  private void chrome(JSONObject input){
    String theme=input.optString("theme","system");if(theme.equals("system")||theme.equals("dark")||theme.equals("light"))getPreferences(MODE_PRIVATE).edit().putString("colorMode",theme).apply();
    double raw=input.optDouble("dim",0);final float dim=(float)(Double.isNaN(raw)?0:Math.max(0,Math.min(1,raw)));String color=input.optString("color","#F9F9F7");int base=Color.rgb(249,249,247);if(color.matches("#[0-9a-fA-F]{6}"))base=Color.parseColor(color);final int chosen=base;
    String resolved=input.optString("resolvedColor");final int target=resolved.matches("#[0-9a-fA-F]{6}")?Color.parseColor(resolved):Color.rgb(Math.round(Color.red(chosen)*(1-dim)+30*dim),Math.round(Color.green(chosen)*(1-dim)+26*dim),Math.round(Color.blue(chosen)*(1-dim)+20*dim));final long duration=Math.max(0,Math.min(400,input.optLong("duration",180)));
    runOnUiThread(()->{web.setBackgroundColor(chosen);if(chromeAnimator!=null)chromeAnimator.cancel();chromeAnimator=android.animation.ValueAnimator.ofObject(new android.animation.ArgbEvaluator(),getWindow().getStatusBarColor(),target);chromeAnimator.setDuration(duration);chromeAnimator.addUpdateListener(animation->{int value=(Integer)animation.getAnimatedValue();getWindow().setStatusBarColor(value);getWindow().setNavigationBarColor(value);});chromeAnimator.start();getWindow().getDecorView().setSystemUiVisibility((Color.red(target)*.299+Color.green(target)*.587+Color.blue(target)*.114)<145?0:View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR|View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);});
  }
  private boolean canNotify(){return Build.VERSION.SDK_INT<33||checkSelfPermission(android.Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED;}
  private void gradeNotification(JSONObject input){
    String grade=input.optString("gradeId");if(grade.isEmpty()||grade.length()>300)return;
    if(!canNotify()){pendingNotification=input;return;}
    NotificationManager manager=(NotificationManager)getSystemService(NOTIFICATION_SERVICE);if(!manager.areNotificationsEnabled())return;
    manager.createNotificationChannel(new NotificationChannel(GRADE_CHANNEL,"新成绩",NotificationManager.IMPORTANCE_DEFAULT));
    Intent launch=new Intent(this,MainActivity.class).putExtra(GRADE_EXTRA,grade).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP|Intent.FLAG_ACTIVITY_CLEAR_TOP);
    PendingIntent open=PendingIntent.getActivity(this,grade.hashCode(),launch,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    Notification notification=new Notification.Builder(this,GRADE_CHANNEL).setSmallIcon(getApplicationInfo().icon).setContentTitle("Folio · 有新成绩").setContentText("有课程成绩更新，点按查看").setAutoCancel(true).setContentIntent(open).setVisibility(Notification.VISIBILITY_PRIVATE).build();manager.notify(grade.hashCode(),notification);
  }
  private void requestGradePermission(){if(Build.VERSION.SDK_INT>=33&&!canNotify()&&!notificationPermissionPending){notificationPermissionPending=true;requestPermissions(new String[]{android.Manifest.permission.POST_NOTIFICATIONS},201);}}
  public void onRequestPermissionsResult(int request,String[] permissions,int[] grants){super.onRequestPermissionsResult(request,permissions,grants);if(request==201){notificationPermissionPending=false;JSONObject pending=pendingNotification;pendingNotification=null;if(pending!=null&&canNotify())gradeNotification(pending);if(trusted)web.evaluateJavascript("window.dispatchEvent(new Event('folio-notification-permission'))",null);}}
  private void deliverGrade(){if(!pageReady||!trusted||pendingGradeId.isEmpty())return;String id=pendingGradeId;pendingGradeId="";web.evaluateJavascript("window.dispatchEvent(new CustomEvent('folio-open-grade',{detail:{gradeId:"+JSONObject.quote(id)+"}}))",null);}
  protected void onNewIntent(Intent intent){super.onNewIntent(intent);setIntent(intent);String grade=intent.getStringExtra(GRADE_EXTRA);if(grade!=null){pendingGradeId=grade;deliverGrade();}}
  private final class Bridge {
    @JavascriptInterface public void call(String id,String operation,String payload){
      if(!trusted||id==null||id.length()>100||payload==null||payload.length()>24*1024*1024)return;
      if(operation.equals("cancel")){network.cancel(id);return;}
      jobs.submit(()->{JSONObject answer=new JSONObject();try{
        JSONObject input=new JSONObject(payload),data;
        switch(operation){
          case "config.get":data=publicConfig(new JSONObject(vault.get("provider")));break;
          case "config.save":
            JSONObject previous=new JSONObject(vault.get("provider"));
            String base=input.optString("baseUrl").trim();Uri uri=Uri.parse(base);if(!"https".equals(uri.getScheme())||uri.getHost()==null||uri.getUserInfo()!=null||uri.getQuery()!=null||uri.getFragment()!=null)throw new Exception("请填写有效 HTTPS base_url");
            if(!input.has("apiKey"))input.put("apiKey",previous.optString("apiKey"));String secret=input.optString("apiKey");if(!secret.isEmpty()&&!secret.matches("[\\x21-\\x7E]{1,2048}"))throw new Exception("API Key 包含空格、换行或无效字符，请检查后重新填写");vault.put("provider",input.toString());data=publicConfig(input);break;
          case "provider":data=network.provider(id,input,new JSONObject(vault.get("provider")));break;
          case "public.data":data=PublicData.fetch(network,id,input);break;
          case "app.usage.read":data=PhoneUsage.read(MainActivity.this);break;
          case "app.usage.settings":runOnUiThread(()->{try{startActivity(new Intent(android.provider.Settings.ACTION_USAGE_ACCESS_SETTINGS,Uri.parse("package:"+getPackageName())));}catch(ActivityNotFoundException e){startActivity(new Intent(android.provider.Settings.ACTION_USAGE_ACCESS_SETTINGS));}});data=new JSONObject().put("opened",true);break;
          case "school":data=schoolSession.school(id,input);break;
          case "school.account.get":data=schoolSession.account();break;
          case "school.account.save":
            data=schoolSession.save(input);if(data.optBoolean("changed"))clearSchoolCookies();if(input.optBoolean("login")){try{schoolSession.authenticate(id,"academic");data.put("authenticated",true);}catch(Exception error){data.put("authenticated",false).put("warning",error.getMessage()==null?"登录未完成":error.getMessage());}}break;
          case "school.account.forget":clearSchoolCookies();schoolSession.forget();data=new JSONObject().put("forgotten",true);break;
          case "school.authenticate":data=schoolSession.authenticate(id,input.optString("site","academic"));break;
          case "school.diagnostics":data=new JSONObject().put("lines",network.diagnostics());break;
          case "school.login":runOnUiThread(()->schoolLogin(input.optString("site")));data=new JSONObject().put("opened",true);break;
          case "school.logout":
            clearSchoolCookies();data=new JSONObject().put("cleared",true);break;
          case "app.chrome":chrome(input);data=new JSONObject();break;
          case "app.notify":boolean foreground=resumed;runOnUiThread(()->{if(!resumed)gradeNotification(input);});data=new JSONObject().put("foreground",foreground);break;
          case "app.notification.status":data=new JSONObject().put("allowed",canNotify()&&((NotificationManager)getSystemService(NOTIFICATION_SERVICE)).areNotificationsEnabled());break;
          case "app.notification.permission":runOnUiThread(()->requestGradePermission());data=new JSONObject().put("requested",true);break;
          case "app.notification.settings":runOnUiThread(()->startActivity(new Intent(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(android.provider.Settings.EXTRA_APP_PACKAGE,getPackageName())));data=new JSONObject();break;
          case "app.background":runOnUiThread(()->moveTaskToBack(true));data=new JSONObject();break;
          default:throw new Exception("未知本地服务");
        }
        answer.put("ok",true).put("data",data);
      }catch(Exception e){try{answer.put("ok",false).put("error",e instanceof java.net.SocketTimeoutException?"请求超时，原来的数据仍保留":e.getMessage()==null?"请求失败":e.getMessage());}catch(JSONException ignored){}}
      reply(id,answer);});
    }
  }
  private void handleBack(){if(loginDialog!=null&&loginDialog.isShowing()){if(loginView.canGoBack())loginView.goBack();else loginDialog.dismiss();return;}web.evaluateJavascript("window.FolioNative&&window.FolioNative.back()",null);}
  public void onBackPressed(){handleBack();}
  protected void onResume(){super.onResume();resumed=true;if(web!=null&&pageReady&&trusted)web.evaluateJavascript("window.dispatchEvent(new Event('folio-native-resume'))",null);}
  protected void onPause(){resumed=false;super.onPause();web.evaluateJavascript("window.dispatchEvent(new Event('folio-native-background'))",null);CookieManager.getInstance().flush();}
  protected void onDestroy(){trusted=false;if(loginDialog!=null&&loginDialog.isShowing())loginDialog.dismiss();network.close();jobs.shutdownNow();web.removeJavascriptInterface("FolioAndroid");web.destroy();super.onDestroy();}
}
