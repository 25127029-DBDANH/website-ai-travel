import { expect, test } from '@playwright/test';

const RECOVERY_CODE_RE = /^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/;

function makeCredentials() {
  const suffix = `${Date.now().toString(36).slice(-6)}${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0')}`;
  return {
    username: `e2e_rec_${suffix}`,
    initialPassword: 'SaigonGuide2026!Pass',
    newPassword: 'SaigonReset2026!Next',
  };
}

test('password recovery via one-time recovery code rotates code and allows sign-in with new password', async ({
  page,
}) => {
  const { username, initialPassword, newPassword } = makeCredentials();
  const authDialog = page.getByRole('dialog');
  const main = page.getByRole('main');

  let initialRecoveryCode = '';

  await test.step('Register, capture one-time recovery code, complete onboarding, and sign out', async () => {
    await page.goto('/', { waitUntil: 'load' });

    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(authDialog).toBeVisible();

    await authDialog.getByRole('button', { name: 'Create account', exact: true }).click();
    await expect(
      authDialog.getByRole('heading', { name: 'Create your account' })
    ).toBeVisible();

    await authDialog.getByLabel('Username').fill(username);
    await authDialog.getByLabel('Password', { exact: true }).fill(initialPassword);

    await authDialog
      .getByRole('button', { name: 'Create account', exact: true })
      .and(authDialog.locator('[type="submit"]'))
      .click();

    await expect(
      authDialog.getByRole('heading', { name: 'Save your recovery code' })
    ).toBeVisible();

    const codeLocator = authDialog.getByText(RECOVERY_CODE_RE);
    await expect(codeLocator).toBeVisible();
    initialRecoveryCode = (await codeLocator.textContent()).trim();
    expect(initialRecoveryCode).toMatch(RECOVERY_CODE_RE);

    const continueButton = authDialog.getByRole('button', { name: 'Continue', exact: true });
    await expect(continueButton).toBeDisabled();

    await authDialog
      .getByRole('checkbox', { name: 'I have saved this code in a safe place' })
      .check();
    await expect(continueButton).toBeEnabled();
    await continueButton.click();

    await expect(authDialog).toBeHidden();
    await expect(page.getByRole('link', { name: username })).toBeVisible();

    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('link', { name: username })).toBeHidden();
  });

  await test.step('Navigate from sign-in modal to /forgot-password', async () => {
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(authDialog).toBeVisible();
    await expect(authDialog.getByRole('heading', { name: 'Sign in' })).toBeVisible();

    await authDialog.getByRole('link', { name: 'Forgot password?' }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);
    await expect(authDialog).toBeHidden();
    await expect(
      main.getByRole('heading', { level: 1, name: 'Reset your password' })
    ).toBeVisible();
  });

  await test.step('Submitting an incorrect recovery code shows an error alert', async () => {
    const wrongCode =
      initialRecoveryCode === 'AAAA-AAAA-AAAA' ? 'BBBB-BBBB-BBBB' : 'AAAA-AAAA-AAAA';

    await main.getByLabel('Username').fill(username);
    await main.getByLabel('Recovery code').fill(wrongCode);
    await main.getByLabel('New password', { exact: true }).fill(newPassword);
    await main.getByLabel('Confirm new password', { exact: true }).fill(newPassword);

    await main.getByRole('button', { name: 'Reset password', exact: true }).click();

    const errorAlert = main.getByRole('alert');
    await expect(errorAlert).toBeVisible();
    await expect(errorAlert).toContainText('Username or recovery code is incorrect.');
  });

  await test.step('Submitting the valid recovery code rotates the code and updates the password', async () => {
    await main.getByLabel('Recovery code').fill(initialRecoveryCode);
    await main.getByRole('button', { name: 'Reset password', exact: true }).click();

    await expect(
      main.getByRole('heading', { level: 1, name: 'Password reset complete' })
    ).toBeVisible();

    const rotatedCodeLocator = main.getByText(RECOVERY_CODE_RE);
    await expect(rotatedCodeLocator).toBeVisible();
    const rotatedRecoveryCode = (await rotatedCodeLocator.textContent()).trim();
    expect(rotatedRecoveryCode).toMatch(RECOVERY_CODE_RE);
    expect(rotatedRecoveryCode).not.toBe(initialRecoveryCode);

    const signInButton = main.getByRole('button', { name: 'Sign in', exact: true });
    await expect(signInButton).toBeDisabled();

    await main
      .getByRole('checkbox', { name: 'I have saved this code in a safe place' })
      .check();
    await expect(signInButton).toBeEnabled();
    await signInButton.click();
  });

  await test.step('Sign in with the new password succeeds', async () => {
    await expect(page).toHaveURL(/\/$/);
    await expect(authDialog).toBeVisible();
    await expect(authDialog.getByRole('heading', { name: 'Sign in' })).toBeVisible();

    await authDialog.getByLabel('Username').fill(username);
    await authDialog.getByLabel('Password', { exact: true }).fill(newPassword);

    await authDialog
      .getByRole('button', { name: 'Sign in', exact: true })
      .and(authDialog.locator('[type="submit"]'))
      .click();

    await expect(authDialog).toBeHidden();
    await expect(page.getByRole('link', { name: username })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeHidden();
  });
});
