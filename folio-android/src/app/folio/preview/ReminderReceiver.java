package app.folio.preview;
import android.content.*;
public final class ReminderReceiver extends BroadcastReceiver {
  public void onReceive(Context context,Intent intent){final PendingResult result=goAsync();final Context app=context.getApplicationContext();final boolean due=LocalReminders.ACTION.equals(intent.getAction());new Thread(()->{try{if(due)LocalReminders.deliver(app);else LocalReminders.restore(app);}finally{result.finish();}},"folio-reminders").start();}
}
