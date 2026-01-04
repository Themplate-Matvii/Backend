import * as subscriptionController from "@modules/billing/subscriptions/subscription.controller";

describe('subscription controller', () => {
  test('getMySubscription function exists', () => {
    expect(typeof subscriptionController.getMySubscription).toBe('function');
  });
});
