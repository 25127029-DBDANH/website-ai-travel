import { expect, test } from '@playwright/test';

function makeCredentials() {
  const suffix = `${Date.now().toString(36).slice(-6)}${Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0')}`;
  return {
    username: `e2e_${suffix}`,
    password: 'SaigonGuide2026!Pass',
  };
}

test('register, logout/login, create a trip via form, and verify it in My Trips', async ({
  page,
}) => {
  const { username, password } = makeCredentials();
  const authDialog = page.getByRole('dialog');

  let createdPath = '';
  let createdTitle = '';

  await test.step('Register a new account via UI', async () => {
    await page.goto('/', { waitUntil: 'load' });

    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(authDialog).toBeVisible();

    await authDialog.getByRole('button', { name: 'Create account', exact: true }).click();
    await expect(
      authDialog.getByRole('heading', { name: 'Create your account' })
    ).toBeVisible();

    await authDialog.getByLabel('Username').fill(username);
    await authDialog.getByLabel('Password', { exact: true }).fill(password);

    await authDialog
      .getByRole('button', { name: 'Create account', exact: true })
      .and(authDialog.locator('[type="submit"]'))
      .click();

    await expect(
      authDialog.getByRole('heading', { name: 'Save your recovery code' })
    ).toBeVisible();

    const recoveryCodePattern = /^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/;
    const recoveryCode = authDialog.getByText(recoveryCodePattern);
    await expect(recoveryCode).toBeVisible();
    expect((await recoveryCode.textContent()).trim()).toMatch(recoveryCodePattern);

    const continueButton = authDialog.getByRole('button', { name: 'Continue', exact: true });
    await expect(continueButton).toBeDisabled();

    await authDialog
      .getByRole('checkbox', { name: 'I have saved this code in a safe place' })
      .check();
    await expect(continueButton).toBeEnabled();
    await continueButton.click();

    await expect(authDialog).toBeHidden();
    await expect(page.getByRole('link', { name: username })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeHidden();
  });

  await test.step('Sign out and sign back in', async () => {
    await page.getByRole('button', { name: 'Sign out' }).click();
    await expect(page.getByRole('button', { name: 'Sign in' })).toBeVisible();
    await expect(page.getByRole('link', { name: username })).toBeHidden();

    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(authDialog).toBeVisible();
    await expect(authDialog.getByRole('heading', { name: 'Sign in' })).toBeVisible();

    await authDialog.getByLabel('Username').fill(username);
    await authDialog.getByLabel('Password', { exact: true }).fill(password);

    await authDialog
      .getByRole('button', { name: 'Sign in', exact: true })
      .and(authDialog.locator('[type="submit"]'))
      .click();

    await expect(authDialog).toBeHidden();
    await expect(page.getByRole('link', { name: username })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  });

  await test.step('Create a trip through the wizard and verify itinerary stops', async () => {
    const tripBasicsHeading = page.getByRole('heading', { level: 3, name: 'Trip basics', exact: true });
    await tripBasicsHeading.scrollIntoViewIfNeeded();
    await expect(tripBasicsHeading).toBeVisible();

    await page.getByRole('button', { name: 'Decrease days' }).click();
    await expect(page.locator('#trip-days output')).toHaveText('2 days');

    const nextButton = page.getByRole('button', { name: 'Next', exact: true });

    await nextButton.click();
    await expect(page.getByRole('heading', { level: 3, name: 'Who is going', exact: true })).toBeVisible();

    await nextButton.click();
    await expect(page.getByRole('heading', { level: 3, name: 'Budget', exact: true })).toBeVisible();

    await nextButton.click();
    await expect(page.getByRole('heading', { level: 3, name: 'Style & pace', exact: true })).toBeVisible();

    await nextButton.click();
    await expect(
      page.getByRole('heading', { level: 3, name: 'Food & transit', exact: true })
    ).toBeVisible();

    await page.getByRole('button', { name: 'Skip, review' }).click();
    await expect(page.getByRole('heading', { level: 3, name: 'Review trip', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Build my itinerary' }).click();

    const conceptDialog = page.getByRole('dialog', { name: 'Your trip concept' });
    await expect(conceptDialog).toBeVisible();
    await conceptDialog.getByRole('button', { name: 'Approve and create itinerary' }).click();

    await expect(page).toHaveURL(/\/trip\/(?!demo$)[^/]+$/, { timeout: 30_000 });
    createdPath = new URL(page.url()).pathname;

    const tripHeading = page.getByRole('heading', { level: 1 });
    await expect(tripHeading).toBeVisible();
    createdTitle = (await tripHeading.textContent()).trim();
    expect(createdTitle.length).toBeGreaterThan(0);

    const itinerary = page.getByRole('region', { name: 'Your itinerary' });
    await expect(itinerary).toBeVisible();
    const stops = itinerary.getByRole('article');
    await expect(stops.first()).toBeVisible();
    expect(await stops.count()).toBeGreaterThanOrEqual(1);
  });

  await test.step('Verify created trip appears in My Trips', async () => {
    await page.getByRole('link', { name: 'My Trips' }).click();
    await expect(page).toHaveURL(/\/trips$/);
    await expect(page.getByRole('heading', { level: 1, name: 'My Trips' })).toBeVisible();

    const savedTripLink = page.getByRole('link', { name: createdTitle }).first();
    await expect(savedTripLink).toBeVisible();
    await expect(savedTripLink).toHaveAttribute('href', createdPath);
  });
});
