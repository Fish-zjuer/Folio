package app.folio.preview;

import android.Manifest;
import android.app.*;
import android.content.*;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.service.notification.StatusBarNotification;
import org.json.*;
import java.util.*;

/** One persistent alarm feeds a local queue. No WebView, account, or network required. */
public final class LocalReminders {
  public static final String EXTRA="folio.reminder",ACTION="app.folio.preview.REMINDER";
  private static final String CHANNEL="folio-local-reminders",PREFIX="folio.reminder.",STORE="folio.local-reminders.v1";
  private static final Object LOCK=new Object();
  private static android.content.SharedPreferences prefs(Context c){return c.getSharedPreferences(STORE,Context.MODE_PRIVATE);}
  private static JSONObject read(Context c)throws JSONException{return new JSONObject(prefs(c).getString("plan","{}"));}
  private static void write(Context c,JSONObject plan)throws Exception{if(!prefs(c).edit().putString("plan",plan.toString()).commit())throw new Exception("提醒计划未能保存，请重试");}
  private static NotificationManager notifications(Context c){return (NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);}
  private static int icon(Context c){return c.getResources().getIdentifier("ic_notification","drawable",c.getPackageName());}
  private static AlarmManager alarms(Context c){return (AlarmManager)c.getSystemService(Context.ALARM_SERVICE);}
  private static void channel(Context c){notifications(c).createNotificationChannel(new NotificationChannel(CHANNEL,"事项与课程提醒",NotificationManager.IMPORTANCE_DEFAULT));}
  private static boolean allowed(Context c){NotificationManager m=notifications(c);NotificationChannel ch=m.getNotificationChannel(CHANNEL);return (Build.VERSION.SDK_INT<33||c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)==PackageManager.PERMISSION_GRANTED)&&m.areNotificationsEnabled()&&(ch==null||ch.getImportance()!=NotificationManager.IMPORTANCE_NONE);}
  private static boolean exact(Context c){return Build.VERSION.SDK_INT<31||alarms(c).canScheduleExactAlarms();}
  private static PendingIntent alarm(Context c){Intent i=new Intent(c,ReminderReceiver.class).setAction(ACTION);return PendingIntent.getBroadcast(c,7102,i,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);}
  private static Set<String> fired(JSONObject plan){Set<String> done=new HashSet<>();JSONArray a=plan.optJSONArray("fired");if(a!=null)for(int i=0;i<a.length();i++)done.add(a.optString(i));return done;}
  private static JSONArray entries(JSONObject plan){JSONArray a=plan.optJSONArray("entries");return a==null?new JSONArray():a;}
  private static long next(JSONObject plan,long now){if(!plan.optBoolean("enabled"))return 0;Set<String> done=fired(plan);long at=Long.MAX_VALUE;JSONArray a=entries(plan);for(int i=0;i<a.length();i++){JSONObject r=a.optJSONObject(i);if(r!=null&&!done.contains(r.optString("key"))&&r.optLong("at")>=now-86400000L)at=Math.min(at,r.optLong("at"));}return at==Long.MAX_VALUE?0:at;}
  private static void arm(Context c,JSONObject plan){AlarmManager a=alarms(c);PendingIntent p=alarm(c);a.cancel(p);long at=next(plan,System.currentTimeMillis());if(at==0||!allowed(c))return;at=Math.max(at,System.currentTimeMillis()+1000);try{if(exact(c))a.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,p);else a.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,p);}catch(SecurityException revoked){a.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,p);}}
  private static String text(JSONObject r,String key,int max)throws Exception{String value=r.optString(key,"");if(value.isEmpty()||value.length()>max||value.matches("(?s).*[\\p{Cntrl}].*"))throw new Exception("提醒数据格式不正确");return value;}
  public static JSONObject sync(Context c,JSONObject input)throws Exception{synchronized(LOCK){
    JSONArray incoming=input.optJSONArray("entries"),active=input.optJSONArray("active");if(input.optInt("version")!=1||incoming==null||incoming.length()>4096||active==null||active.length()>20000)throw new Exception("提醒计划过大或格式不正确");
    long now=System.currentTimeMillis();JSONArray clean=new JSONArray();Set<String> keys=new HashSet<>();
    for(int i=0;i<incoming.length();i++){JSONObject r=incoming.getJSONObject(i);String key=text(r,"key",1024),id=text(r,"itemId",300),revision=text(r,"revision",2048),title=text(r,"title",160),kind=r.optString("kind","todo");long at=r.optLong("at",0);if(at<now-86400000L||at>now+367L*86400000L||!Arrays.asList("todo","homework","lesson","event").contains(kind)||!keys.add(key))throw new Exception("提醒数据格式不正确");clean.put(new JSONObject().put("key",key).put("itemId",id).put("revision",revision).put("title",title).put("kind",kind).put("at",at));}
    Map<String,String> current=new HashMap<>();if(input.optBoolean("enabled"))for(int i=0;i<active.length();i++){JSONObject r=active.getJSONObject(i);current.put(text(r,"id",300),text(r,"revision",2048));}
    JSONObject old=read(c);JSONArray oldDone=old.optJSONArray("fired"),done=new JSONArray();if(oldDone!=null)for(int i=0;i<oldDone.length();i++)if(keys.contains(oldDone.optString(i)))done.put(oldDone.optString(i));
    JSONObject plan=new JSONObject().put("enabled",input.optBoolean("enabled",false)).put("through",Math.max(0,input.optLong("through"))).put("entries",clean).put("fired",done);
    write(c,plan);channel(c);
    for(StatusBarNotification n:notifications(c).getActiveNotifications())if(n.getTag()!=null&&n.getTag().startsWith(PREFIX)){String id=n.getNotification().extras.getString("folio.itemId"),rev=n.getNotification().extras.getString("folio.revision");if(!plan.optBoolean("enabled")||n.getTag().equals(PREFIX+"summary")||!Objects.equals(current.get(id),rev))notifications(c).cancel(n.getTag(),0);}
    arm(c,plan);return status(c);
  }}
  public static JSONObject status(Context c)throws Exception{synchronized(LOCK){JSONObject p=read(c);long now=System.currentTimeMillis();int count=0;Set<String> done=fired(p);JSONArray a=entries(p);for(int i=0;i<a.length();i++)if(a.getJSONObject(i).optLong("at")>now&&!done.contains(a.getJSONObject(i).optString("key")))count++;return new JSONObject().put("allowed",allowed(c)).put("exact",exact(c)).put("enabled",p.optBoolean("enabled")).put("pending",count).put("next",next(p,now)).put("through",p.optLong("through"));}}
  public static void restore(Context c){synchronized(LOCK){try{arm(c,read(c));}catch(Exception ignored){/* Preserve saved plan on transient system failures. */}}}
  public static void deliver(Context c){synchronized(LOCK){try{
    JSONObject p=read(c);if(!p.optBoolean("enabled"))return;long now=System.currentTimeMillis();Set<String> done=fired(p);JSONArray a=entries(p);List<JSONObject> due=new ArrayList<>();for(int i=0;i<a.length();i++){JSONObject r=a.getJSONObject(i);if(r.optLong("at")<=now&&!done.contains(r.optString("key"))){done.add(r.optString("key"));if(r.optLong("at")>=now-86400000L)due.add(r);}}
    p.put("fired",new JSONArray(done));write(c,p); // Commit before notifying: redelivery cannot duplicate the same reminder.
    if(allowed(c)){channel(c);int start=Math.max(0,due.size()-8);for(int i=start;i<due.size();i++)post(c,due.get(i));if(start>0)summary(c,due.size());}arm(c,p);
  }catch(Exception ignored){restore(c);}}}
  private static void post(Context c,JSONObject r)throws Exception{
    String id=r.getString("itemId"),key=r.getString("key");JSONObject target=new JSONObject().put("itemId",id);
    Intent launch=new Intent(c,MainActivity.class).setData(Uri.parse("folio://reminder/"+Uri.encode(key))).putExtra(EXTRA,target.toString()).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP|Intent.FLAG_ACTIVITY_CLEAR_TOP);
    PendingIntent open=PendingIntent.getActivity(c,0,launch,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    String label=r.optString("kind").equals("lesson")?"课程安排提醒":r.optString("kind").equals("homework")?"作业提醒":"事项提醒";
    Notification publicView=new Notification.Builder(c,CHANNEL).setSmallIcon(icon(c)).setContentTitle("Folio · "+label).setContentText("点按查看安排").build();
    android.os.Bundle meta=new android.os.Bundle();meta.putString("folio.itemId",id);meta.putString("folio.revision",r.optString("revision"));
    Notification n=new Notification.Builder(c,CHANNEL).setSmallIcon(icon(c)).setContentTitle(r.getString("title")).setContentText(label+" · 点按查看").setVisibility(Notification.VISIBILITY_PRIVATE).setPublicVersion(publicView).setAutoCancel(true).setContentIntent(open).setExtras(meta).build();notifications(c).notify(PREFIX+key,0,n);
  }
  private static void summary(Context c,int count){Intent launch=new Intent(c,MainActivity.class).setData(Uri.parse("folio://reminder/summary")).putExtra(EXTRA,"{\"summary\":true}").addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP|Intent.FLAG_ACTIVITY_CLEAR_TOP);PendingIntent open=PendingIntent.getActivity(c,0,launch,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);Notification n=new Notification.Builder(c,CHANNEL).setSmallIcon(icon(c)).setContentTitle("Folio · "+count+"条提醒已到时间").setContentText("点按查看全部提醒记录").setVisibility(Notification.VISIBILITY_PRIVATE).setAutoCancel(true).setContentIntent(open).build();notifications(c).notify(PREFIX+"summary",0,n);}
  public static JSONObject test(Context c)throws Exception{channel(c);if(!allowed(c))throw new Exception("请先允许系统通知");Notification n=new Notification.Builder(c,CHANNEL).setSmallIcon(icon(c)).setContentTitle("Folio · 提醒已就绪").setContentText("这是一条测试通知").setAutoCancel(true).setVisibility(Notification.VISIBILITY_PRIVATE).build();notifications(c).notify("folio.reminder-test",0,n);return new JSONObject().put("sent",true);}
}
