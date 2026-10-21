package app.folio.preview;
/** Recovery test starts with a valid process SSO and must never need a password read. */
final class Vault {
  int reads=0;
  String get(String name){reads++;return "{}";}
  void put(String name,String value){throw new AssertionError("Recovery must not change stored credentials");}
}
