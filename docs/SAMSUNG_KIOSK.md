# Samsung Galaxy Tab S7: pin the family calendar

This is a device setup procedure, not a claim that the tablet has been configured. The app's `/kiosk` route provides the family display; Samsung app pinning keeps that installed app in the foreground. The Parent Portal separately controls access to editing.

## Prepare the tablet

1. Set a strong device PIN or password in Samsung Settings. Keep it private from children. Use a separate, non-default Parent Portal PIN; never use the blueprint's example `1234`.
2. Open the deployed app's `/kiosk` route, sign in to the correct family, and install it with the browser's **Install app / Add to Home screen** action.
3. Launch the installed **Anderson Family Hub** icon. Confirm it opens the live `/kiosk` calendar in landscape without the browser address bar. Use the app's fullscreen/keep-awake controls when available.

## Enable app pinning and require the device lock

Menu labels depend on the installed Android/One UI version. An older Tab S7 may use the first path; Samsung's current documentation uses the later paths. Search Settings for **Pin windows** or **Pin app** if necessary.

| Settings labels | Path to look for |
| --- | --- |
| Older One UI | **Biometrics and security → Other security settings → Pin windows** |
| Other One UI versions | **Security and privacy → Other security settings → Pin windows / Pin app** |
| Current Samsung documentation | **Security and privacy → More security settings → Allow apps to be pinned** |

Turn pinning on. Open its detailed settings and enable **Use screen lock type to unpin**, **Ask for PIN before unpinning**, or the equivalent label for the device's configured lock. The requirement is that leaving the pinned app requires the device credential. Do not assume enabling pinning alone provides this protection: test it below.

Samsung documents the [current enable/pin procedure](https://www.samsung.com/us/support/answer/ANS10004865/) and the [screen-lock requirement and alternate menu labels](https://www.samsung.com/us/support/troubleshoot/TSG10004580/).

## Pin and unpin the installed app

1. With the installed calendar open, open **Recent apps**: tap Recents, or swipe up and hold when using gesture navigation.
2. Tap the calendar's icon above its app card, then **Pin this app**. Follow the tablet's confirmation instructions.
3. To unpin as the parent, hold **Recents + Back** together with navigation buttons, or swipe up and hold with gesture navigation. Enter the device PIN/password when prompted. Follow any on-screen instructions if the tablet's navigation differs.

See [Samsung's unpinning guidance](https://www.samsung.com/us/support/troubleshoot/TSG10004580/) and [Google's navigation-specific instructions](https://support.google.com/android/answer/9455138?hl=en).

## What the two layers protect

- **Device lock:** prevents leaving the pinned app without the tablet's credential. It does not authorize Parent Portal edits.
- **Parent Portal:** requires the app's parent authorization for management actions. A member profile's display role or photo is not a separate authenticated account, and an app PIN does not unlock Android.
- **Browser/PWA:** verify that the installed PWA has its own Recent apps card. If only the browser can be pinned, test its links and navigation carefully: pinning a browser does not restrict it to one website.

Screen pinning is not a complete managed-device kiosk: do not assume automatic relaunch after reboot, remote administration, or all system controls are disabled. Stronger dedicated-device lockdown requires an appropriately managed solution such as [Android Enterprise lock task mode](https://developer.android.com/work/dpc/dedicated-devices/lock-task-mode) or [Samsung Knox kiosk management](https://docs.samsungknox.com/admin/knox-manage/kiosk-devices/introduction/about-kiosk-mode/).

## Acceptance on the actual Tab S7

- [ ] Installed icon starts the live family calendar in landscape; every section remains usable at the chosen display scale.
- [ ] Parent Portal stays locked until the configured Parent PIN is verified; wrong PINs cannot add or change records.
- [ ] Home/Recents gestures cannot leave the pinned app normally.
- [ ] Unpinning requires the device credential; canceling or entering a wrong credential does not expose other apps.
- [ ] Calendar links, recipe playback, and back navigation do not expose an unrestricted browser.
- [ ] Live changes from another authorized device arrive; reconnecting refreshes the display.
- [ ] Idle clock, wake touch, fullscreen, video controls, and keep-awake behavior work on the tablet.
- [ ] Parent can recover access with the device credential; document what happens after restart and re-pin when needed.

Record the tested Android/One UI versions and results before treating the hardware setup as complete. Keep this acceptance separate from desktop browser or database tests.
