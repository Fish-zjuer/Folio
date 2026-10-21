package android.webkit;
import java.net.*;
import java.util.*;
/** A deliberately empty browser at cold start. Production native cookies must work independently. */
public final class CookieManager {
  private static final CookieManager INSTANCE=new CookieManager();
  public final List<String> written=new ArrayList<>();
  public static CookieManager getInstance(){return INSTANCE;}
  public String getCookie(String address){return null;}
  public void setCookie(String address,String value){written.add(value);}
}
