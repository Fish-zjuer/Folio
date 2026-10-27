import UIKit
import UserNotifications

@main
final class AppDelegate: UIResponder, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        UNUserNotificationCenter.current().delegate = self; return true
    }
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse) async {
        guard let id = response.notification.request.content.userInfo["itemId"] as? String else { return }
        await MainActor.run {
            UserDefaults.standard.set(id, forKey: "pendingReminder")
            NotificationCenter.default.post(name: .init("FolioOpenReminder"), object: nil)
        }
    }
}
