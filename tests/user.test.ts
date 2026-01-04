import * as userController from "../src/modules/user/index/user.controller";

describe('user controller', () => {
  test('getCurrentUser function exists', () => {
    expect(typeof userController.getCurrentUser).toBe('function');
  });
});
