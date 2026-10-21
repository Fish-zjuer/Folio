package org.json;
import java.util.*;
/** Test-only diagnostics envelope; no JSON parsing is performed by Network. */
public final class JSONArray {
  private final List<?> data;
  public JSONArray(Collection<?> values){data=new ArrayList<>(values);}
  public String toString(){return data.toString();}
}
