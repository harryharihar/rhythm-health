// Privacy Policy and Terms of Service content for PocketVitals.
//
// PocketVitals is an independent, unregistered project — there is no company
// behind it. This content describes plainly, and only, what the app actually
// does: everything runs and stays on-device (src/storage/storage.js uses
// expo-sqlite with no network layer anywhere in the app), the only external
// read is Apple HealthKit on iOS (with the user's permission, read-only —
// see src/health/), and Android step counts come from the on-device motion
// sensor (ACTIVITY_RECOGNITION, declared in AndroidManifest.xml). There are
// no accounts, no analytics, no ads, and no location tracking — the
// "Distance" stat is estimated from step count, not GPS.

const CURRENT_YEAR = new Date().getFullYear();

export const PRIVACY_POLICY = {
  title: 'Privacy Policy',
  updatedLabel: `Last updated ${CURRENT_YEAR}`,
  sections: [
    {
      heading: 'Overview',
      paragraphs: [
        'PocketVitals is a fully local, offline health-tracking app. It has no backend server, no user accounts, and no network connection of any kind — nothing you enter or log ever leaves your device.',
        'PocketVitals is an independent project and is not published or operated by a registered company. This policy describes exactly what the app does, in plain terms.',
      ],
    },
    {
      heading: 'Information you provide',
      paragraphs: ['You may choose to enter the following, all directly in the app and all editable or removable at any time from Profile:'],
      bullets: [
        'Name, age, gender, height, and weight',
        'Daily goals (steps, water intake, sleep target, bedtime, wake time)',
        'Logged entries: water intake, sleep, weight, workouts, and meals',
      ],
    },
    {
      heading: 'Information read from your device',
      paragraphs: [
        'On iOS, with your explicit permission, PocketVitals reads heart rate, resting heart rate, exercise minutes, and sleep data from Apple Health so it can be shown on your dashboard. PocketVitals only reads this data — it never writes back to Apple Health or shares it anywhere else.',
        'On Android, step counts are read from your device’s built-in motion sensor, which requires the Activity Recognition permission.',
      ],
    },
    {
      heading: 'Where your data lives',
      paragraphs: [
        'Everything is stored in a local database on your device only. Nothing is uploaded, synced, or backed up to any server — because no such server exists for PocketVitals.',
      ],
    },
    {
      heading: 'What PocketVitals does not do',
      bullets: [
        'No account creation or sign-in',
        'No analytics, tracking, or advertising SDKs',
        'No selling or sharing of your data with anyone, because it never leaves your device',
        'No GPS or location tracking — distance shown is estimated from your step count',
      ],
    },
    {
      heading: 'Notifications',
      paragraphs: [
        'If reminders are enabled, they are scheduled locally by your device’s operating system. They are never sent through an external push service, because PocketVitals has no server to send them from.',
      ],
    },
    {
      heading: 'Your control over your data',
      paragraphs: [
        'You can edit or delete any entry at any time. "Clear All Data" in Profile › Data & Storage permanently erases everything stored on this device. Uninstalling the app also removes all of its data, since nothing exists outside of it.',
      ],
    },
    {
      heading: 'Children',
      paragraphs: [
        'PocketVitals does not knowingly target children, does not collect data for advertising, and — since it has no accounts or network access — has no mechanism to identify or contact any user of any age.',
      ],
    },
    {
      heading: 'Changes to this policy',
      paragraphs: [
        'As PocketVitals changes, this policy may be updated to keep matching what the app actually does. The current version is always available from Profile › About.',
      ],
    },
  ],
};

export const TERMS_OF_SERVICE = {
  title: 'Terms of Service',
  updatedLabel: `Last updated ${CURRENT_YEAR}`,
  sections: [
    {
      heading: 'Acceptance of terms',
      paragraphs: ['By using PocketVitals, you agree to these terms. PocketVitals is an independent project, not operated by a registered company.'],
    },
    {
      heading: 'Not medical advice',
      paragraphs: [
        'PocketVitals is a personal wellness tracker, not a medical device. Calorie, distance, and sleep-stage figures shown in the app are estimates for general awareness, not clinical measurements. Always consult a qualified healthcare professional for medical advice, diagnosis, or treatment.',
      ],
    },
    {
      heading: 'Your data, your responsibility',
      paragraphs: [
        'Because all data lives only on your device, it cannot be recovered by the developer if you uninstall the app, use "Clear All Data", or lose your device. Use the Export Data option if you want your own backup.',
      ],
    },
    {
      heading: 'No warranty',
      paragraphs: ['PocketVitals is provided "as is", without warranties of any kind, express or implied, including but not limited to accuracy, reliability, or fitness for a particular purpose.'],
    },
    {
      heading: 'Limitation of liability',
      paragraphs: [
        'To the fullest extent permitted by law, the developer of PocketVitals is not liable for any damages or losses — direct or indirect — arising from your use of, or inability to use, the app.',
      ],
    },
    {
      heading: 'Changes to the app or these terms',
      paragraphs: ['Features and these terms may change between app versions. Continuing to use PocketVitals after an update means you accept the current version of these terms, always available from Profile › About.'],
    },
    {
      heading: 'Copyright',
      paragraphs: [
        `© ${CURRENT_YEAR} PocketVitals. All rights reserved.`,
        'The PocketVitals name, design, and app code are the work of an independent developer and are not associated with any registered company or organization. You may not copy, redistribute, reverse-engineer, or resell this app or its source code without permission.',
      ],
    },
  ],
};
