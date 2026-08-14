const { withEntitlementsPlist } = require('expo/config-plugins');

// expo-notifications unconditionally adds aps-environment (remote push)
// to the entitlements, even though this app only ever schedules local
// notifications and has no push server. Leaving it in requires the Apple
// App ID to have Push Notifications capability enabled and the ad-hoc
// provisioning profile to include it — neither of which is true here, so
// the archive step fails signing validation. Strip it back out.
module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (config) => {
    delete config.modResults['aps-environment'];
    return config;
  });
};
