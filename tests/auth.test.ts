import * as authController from "../src/modules/user/auth/auth.controller";

describe('auth controller', () => {
  test('login function exists', () => {
    expect(typeof authController.login).toBe('function');
  });
});
