package app.folio.preview;

import android.app.AppOpsManager;
import android.app.usage.UsageEvents;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.os.Process;
import org.json.*;
import java.util.*;
import java.text.SimpleDateFormat;

final class PhoneUsage {
  static boolean allowed(Context context){AppOpsManager ops=(AppOpsManager)context.getSystemService(Context.APP_OPS_SERVICE);return ops!=null&&ops.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS,Process.myUid(),context.getPackageName())==AppOpsManager.MODE_ALLOWED;}
  static JSONObject read(Context context) throws Exception {
    JSONObject result=new JSONObject().put("allowed",allowed(context)).put("source","android-usage-events");if(!result.getBoolean("allowed"))return result.put("days",new JSONArray());
    UsageStatsManager manager=(UsageStatsManager)context.getSystemService(Context.USAGE_STATS_SERVICE);if(manager==null)throw new Exception("设备未提供使用情况统计");
    TimeZone zone=TimeZone.getTimeZone("Asia/Shanghai");Calendar date=Calendar.getInstance(zone);long now=System.currentTimeMillis();date.setTimeInMillis(now);date.set(Calendar.HOUR_OF_DAY,0);date.set(Calendar.MINUTE,0);date.set(Calendar.SECOND,0);date.set(Calendar.MILLISECOND,0);date.add(Calendar.DAY_OF_MONTH,-6);
    long[] boundaries=new long[8];for(int i=0;i<8;i++){boundaries[i]=date.getTimeInMillis();date.add(Calendar.DAY_OF_MONTH,1);}
    List<UsageTimeline.Event> records=new ArrayList<>();UsageEvents events=manager.queryEvents(boundaries[0]-86400000L,now);if(events!=null){UsageEvents.Event e=new UsageEvents.Event();while(events.hasNextEvent()){events.getNextEvent(e);int type=e.getEventType();if(type==1||type==2||type==15||type==16||type==17||type==18||type==23||type==26)records.add(new UsageTimeline.Event(e.getTimeStamp(),type,e.getPackageName()+"/"+e.getClassName()));}}
    long[] times=UsageTimeline.totals(records,boundaries,now);long first=records.isEmpty()?Long.MAX_VALUE:records.get(0).at;
    JSONArray days=new JSONArray();SimpleDateFormat format=new SimpleDateFormat("yyyy-MM-dd",Locale.ROOT);format.setTimeZone(zone);
    for(int i=0;i<7;i++){boolean known=first<Math.min(boundaries[i+1],now);days.put(new JSONObject().put("date",format.format(new Date(boundaries[i]))).put("minutes",known?times[i]/60000.0:JSONObject.NULL).put("partial",known&&first>boundaries[i]));}
    return result.put("days",days).put("updatedAt",now);
  }
}
