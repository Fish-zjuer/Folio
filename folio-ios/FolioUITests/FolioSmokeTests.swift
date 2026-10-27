import XCTest

final class FolioSmokeTests: XCTestCase {
    @MainActor
    func testOriginalWebScreensAndUIKitInput() throws {
        continueAfterFailure = false
        let app = XCUIApplication()
        app.launchArguments = ["--folio-simulator-qa"]
        app.launch()
        let status = app.staticTexts["folio.qa.status"]
        XCTAssertTrue(status.waitForExistence(timeout: 30), "native host did not launch")
        let prepared = NSPredicate(format: "label BEGINSWITH 'passed|' OR label BEGINSWITH 'failed|'")
        expectation(for: prepared, evaluatedWith: status)
        waitForExpectations(timeout: 120)
        XCTAssertEqual(status.label, "passed|home")
        attach(app, "01-home-full-device")

        let web = app.webViews.firstMatch
        // Swipe the page body before opening the keyboard. The resized viewport's
        // upper quarter contains the pending-proposal banner, not the home page.
        let start = web.coordinate(withNormalizedOffset: CGVector(dx: 0.85, dy: 0.4))
        start.press(forDuration: 0.05, thenDragTo: web.coordinate(withNormalizedOffset: CGVector(dx: 0.15, dy: 0.4)))
        expectation(for: NSPredicate(format: "label == 'passed|workbench'"), evaluatedWith: status)
        waitForExpectations(timeout: 10)
        attach(app, "02-workbench-after-real-swipe")

        let backStart = web.coordinate(withNormalizedOffset: CGVector(dx: 0.15, dy: 0.4))
        backStart.press(forDuration: 0.05, thenDragTo: web.coordinate(withNormalizedOffset: CGVector(dx: 0.85, dy: 0.4)))
        expectation(for: NSPredicate(format: "label == 'passed|home'"), evaluatedWith: status)
        waitForExpectations(timeout: 10)

        let input = web.textViews.firstMatch
        XCTAssertTrue(input.waitForExistence(timeout: 10))
        input.tap()
        input.typeText("iOS keyboard check")
        // A fresh simulator can show Apple's one-time QuickPath introduction.
        let keyboardIntro = app.buttons["Continue"]
        if keyboardIntro.exists { keyboardIntro.tap() }
        XCTAssertTrue(app.keyboards.firstMatch.waitForExistence(timeout: 10))
        XCTAssertEqual(input.value as? String, "iOS keyboard check")
        attach(app, "03-keyboard-full-device")

        let menu = web.buttons["打开功能菜单"]
        XCTAssertTrue(menu.waitForExistence(timeout: 10))
        menu.tap()
        expectation(for: NSPredicate(format: "label == 'passed|menu'"), evaluatedWith: status)
        waitForExpectations(timeout: 10)
        attach(app, "04-menu-real-tap")
    }

    @MainActor
    private func attach(_ app: XCUIApplication, _ name: String) {
        let attachment = XCTAttachment(screenshot: app.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
