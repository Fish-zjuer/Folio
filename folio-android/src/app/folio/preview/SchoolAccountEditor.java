package app.folio.preview;

import android.app.Activity;
import android.app.Dialog;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.text.InputType;
import android.text.method.PasswordTransformationMethod;
import android.view.*;
import android.view.autofill.AutofillValue;
import android.view.inputmethod.*;
import android.widget.*;
import org.json.JSONObject;
import java.util.concurrent.Executor;
import java.util.function.Consumer;

/** Native, stable credential fields. Only account metadata returns to the WebView. */
final class SchoolAccountEditor extends Dialog {
  interface Saver {JSONObject save(JSONObject input) throws Exception;}
  private final Activity activity;
  private final Executor jobs;
  private final Saver saver;
  private final Consumer<JSONObject> result;
  private final Entry username,password;
  private final Button save,cancel;
  private final TextView error;
  private boolean finished=false,saving=false;
  private final boolean hadPassword;
  private final String initialUsername;
  private int px(float dp){return Math.round(dp*getContext().getResources().getDisplayMetrics().density);}
  private GradientDrawable paper(int fill,int stroke,int radius){GradientDrawable d=new GradientDrawable();d.setColor(fill);d.setCornerRadius(px(radius));if(stroke!=0)d.setStroke(px(1),stroke);return d;}
  private TextView text(String value,int size,int color){TextView t=new TextView(getContext());t.setText(value);t.setTextSize(size);t.setTextColor(color);return t;}
  SchoolAccountEditor(Activity activity,JSONObject account,boolean dark,Executor jobs,Saver saver,Consumer<JSONObject> result){
    super(activity);this.activity=activity;this.jobs=jobs;this.saver=saver;this.result=result;hadPassword=account.optBoolean("hasPassword");initialUsername=account.optString("username");
    requestWindowFeature(Window.FEATURE_NO_TITLE);
    int bg=Color.parseColor(dark?"#242521":"#F9F9F7"),surface=Color.parseColor(dark?"#2F302A":"#FFFFFF"),ink=Color.parseColor(dark?"#E7E2D7":"#242521"),muted=Color.parseColor(dark?"#B7B5A8":"#79796D"),line=Color.parseColor(dark?"#44463C":"#E3E3DA"),accent=Color.parseColor(dark?"#D59173":"#A86D4C");
    LinearLayout content=new LinearLayout(activity);content.setOrientation(LinearLayout.VERTICAL);content.setPadding(px(22),px(24),px(22),px(22));GradientDrawable sheet=paper(bg,0,0);float radius=px(24);sheet.setCornerRadii(new float[]{radius,radius,radius,radius,0,0,0,0});content.setBackground(sheet);content.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
    TextView title=text("学校账号",23,ink);title.setTypeface(Typeface.create("serif",Typeface.NORMAL));content.addView(title);
    TextView note=text("账号密码加密保存在本机",12,muted);note.setPadding(0,px(9),0,px(20));content.addView(note);
    username=entry(content,"学号",account.optString("username"),false,ink,muted,surface,line);
    password=entry(content,hadPassword?"密码 · 留空沿用":"密码","",true,ink,muted,surface,line);
    username.setImeOptions((username.getImeOptions()&~EditorInfo.IME_MASK_ACTION)|EditorInfo.IME_ACTION_NEXT);password.setImeOptions((password.getImeOptions()&~EditorInfo.IME_MASK_ACTION)|EditorInfo.IME_ACTION_DONE);
    username.setOnEditorActionListener((v,action,event)->{if(action==EditorInfo.IME_ACTION_NEXT){password.requestFocus();return true;}return false;});
    password.setOnEditorActionListener((v,action,event)->{if(action==EditorInfo.IME_ACTION_DONE){submit();return true;}return false;});
    error=text("",12,Color.parseColor(dark?"#E29B83":"#AC533D"));error.setPadding(0,px(10),0,px(8));error.setAccessibilityLiveRegion(View.ACCESSIBILITY_LIVE_REGION_POLITE);content.addView(error);
    LinearLayout actions=new LinearLayout(activity);actions.setOrientation(LinearLayout.HORIZONTAL);cancel=new Button(activity);cancel.setText("取消");cancel.setAllCaps(false);cancel.setTextColor(muted);cancel.setTextSize(14);cancel.setBackground(paper(surface,line,13));save=new Button(activity);save.setText("登录并同步");save.setAllCaps(false);save.setTextSize(14);save.setTextColor(dark?bg:Color.WHITE);save.setBackground(paper(accent,0,13));
    // Custom flat papers must not inherit the system Button's raised/pressed shadow.
    for(Button button:new Button[]{cancel,save}){button.setStateListAnimator(null);button.setElevation(0);button.setTranslationZ(0);}
    LinearLayout.LayoutParams left=new LinearLayout.LayoutParams(0,px(48),1);left.rightMargin=px(10);actions.addView(cancel,left);actions.addView(save,new LinearLayout.LayoutParams(0,px(48),2));content.addView(actions);
    setContentView(content);setCanceledOnTouchOutside(false);cancel.setOnClickListener(v->dismiss());save.setOnClickListener(v->submit());
    setOnDismissListener(d->{username.getText().clear();password.getText().clear();if(!finished){finished=true;try{result.accept(new JSONObject().put("saved",false).put("cancelled",true));}catch(Exception ignored){}}});
    Window w=getWindow();w.setBackgroundDrawableResource(android.R.color.transparent);w.setGravity(Gravity.BOTTOM);w.addFlags(WindowManager.LayoutParams.FLAG_SECURE);w.setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE|WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_VISIBLE);
  }
  private Entry entry(LinearLayout parent,String label,String value,boolean secret,int ink,int muted,int bg,int line){
    TextView title=text(label,12,muted);title.setPadding(0,0,0,px(8));parent.addView(title);
    Entry input=new Entry(activity);input.setSingleLine(true);input.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS|(secret?InputType.TYPE_TEXT_VARIATION_PASSWORD:InputType.TYPE_TEXT_VARIATION_NORMAL));if(secret)input.setTransformationMethod(PasswordTransformationMethod.getInstance());input.setTextColor(ink);input.setTextSize(17);input.setPadding(px(13),px(10),px(13),px(10));input.setBackground(paper(bg,line,12));input.setContentDescription(label);input.setText(value);input.setSelection(value.length());LinearLayout.LayoutParams layout=new LinearLayout.LayoutParams(-1,px(50));layout.bottomMargin=px(14);parent.addView(input,layout);return input;
  }
  @Override public void show(){super.show();Window w=getWindow();w.setLayout(-1,-2);(hadPassword?password:username).requestFocus();}
  @Override public void cancel(){if(!saving)super.cancel();}
  private void submit(){
    if(saving||finished)return;String user=username.getText().toString().trim(),secret=password.getText().toString();
    if(!user.matches("[A-Za-z0-9._-]{3,64}")){error.setText("请填写有效学号／统一身份认证账号");username.requestFocus();return;}
    if(secret.isEmpty()&&(!hadPassword||!user.equals(initialUsername))){error.setText("请填写密码");password.requestFocus();return;}
    if(secret.length()>512){error.setText("密码长度超出限制");password.requestFocus();return;}
    final JSONObject input=new JSONObject();try{input.put("username",user);if(!secret.isEmpty())input.put("password",secret);}catch(Exception ignored){return;}
    saving=true;setCancelable(false);save.setEnabled(false);cancel.setEnabled(false);username.setEnabled(false);password.setEnabled(false);save.setText("保存中…");error.setText("");
    jobs.execute(()->{try{JSONObject account=saver.save(input);input.remove("password");activity.runOnUiThread(()->{if(finished||!isShowing())return;finished=true;try{result.accept(new JSONObject().put("saved",true).put("account",account));}catch(Exception ignored){}dismiss();});}
      catch(Exception e){input.remove("password");activity.runOnUiThread(()->{if(finished||!isShowing())return;saving=false;setCancelable(true);save.setEnabled(true);cancel.setEnabled(true);username.setEnabled(true);password.setEnabled(true);save.setText("登录并同步");error.setText("账号未能保存，请检查填写内容后重试");});}});
  }
  /** Explicitly provide no autofill data, even if a service requests unimportant views. */
  private static final class Entry extends EditText {
    Entry(Activity activity){super(activity);setId(View.NO_ID);setSaveEnabled(false);setAutofillHints((String[])null);setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);if(Build.VERSION.SDK_INT>=29)setImportantForContentCapture(View.IMPORTANT_FOR_CONTENT_CAPTURE_NO_EXCLUDE_DESCENDANTS);}
    @Override public int getAutofillType(){return View.AUTOFILL_TYPE_NONE;}
    @Override public AutofillValue getAutofillValue(){return null;}
    @Override public void autofill(AutofillValue value){}
    @Override public void onProvideAutofillStructure(ViewStructure structure,int flags){structure.setAutofillType(View.AUTOFILL_TYPE_NONE);}
    @Override public InputConnection onCreateInputConnection(EditorInfo info){InputConnection connection=super.onCreateInputConnection(info);info.imeOptions|=EditorInfo.IME_FLAG_NO_PERSONALIZED_LEARNING|EditorInfo.IME_FLAG_NO_EXTRACT_UI;return connection;}
  }
}
