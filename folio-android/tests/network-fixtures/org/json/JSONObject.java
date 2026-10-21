package org.json;
import java.util.*;
/** Test-only envelope. Only the empty JSON object fixture is accepted as input, not arbitrary JSON. */
public final class JSONObject {
  private final Map<String,Object> data=new LinkedHashMap<>();
  public JSONObject(){}
  public JSONObject(String empty){if(!"{}".equals(empty))throw new IllegalArgumentException("No JSON parser in this fixture");}
  public JSONObject put(String key,Object value){data.put(key,value);return this;}
  public String optString(String key){Object value=data.get(key);return value==null?"":String.valueOf(value);}
  public String optString(String key,String fallback){return data.containsKey(key)?optString(key):fallback;}
  public int optInt(String key){Object value=data.get(key);return value instanceof Number?((Number)value).intValue():0;}
  public int optInt(String key,int fallback){return data.containsKey(key)?optInt(key):fallback;}
  public boolean optBoolean(String key){return Boolean.TRUE.equals(data.get(key));}
  public boolean optBoolean(String key,boolean fallback){return data.containsKey(key)?optBoolean(key):fallback;}
  public Object opt(String key){return data.get(key);}
  public boolean has(String key){return data.containsKey(key);}
  public String getString(String key){return optString(key);}
  public JSONObject getJSONObject(String key){return (JSONObject)data.get(key);}
}
