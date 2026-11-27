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
    const introHeading = page.getByRole('heading', {
      level: 3,
      name: 'Start from a trip idea',
      exact: true,
    });
    await introHeading.scrollIntoViewIfNeeded();
    await expect(introHeading).toBeVisible();

    await page.getByRole('button', { name: 'Choose step by step', exact: true }).click();
    await expect(
      page.getByRole('heading', { level: 3, name: 'When & where', exact: true })
    ).toBeVisible();

    const twoDaysButton = page.getByRole('button', { name: '2 days, 1 night', exact: true });
    await twoDaysButton.click();
    await expect(twoDaysButton).toHaveAttribute('aria-pressed', 'true');

    const nextButton = page.getByRole('button', { name: 'Next', exact: true });

    await nextButton.click();
    await expect(
      page.getByRole('heading', { level: 3, name: "Who's coming", exact: true })
    ).toBeVisible();

    await nextButton.click();
    await expect(
      page.getByRole('heading', { level: 3, name: 'Your vibe', exact: true })
    ).toBeVisible();

    await page.getByRole('button', { name: 'Build my itinerary now', exact: true }).click();

    const conceptDialog = page.getByRole('dialog', { name: 'Your trip concept' });
    await expect(conceptDialog).toBeVisible({ timeout: 30_000 });
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

test('pick a trip idea template, jump to vibe step, and trigger itinerary build', async ({
  page,
}) => {
  await page.goto('/', { waitUntil: 'load' });

  const introHeading = page.getByRole('heading', {
    level: 3,
    name: 'Start from a trip idea',
    exact: true,
  });
  await introHeading.scrollIntoViewIfNeeded();
  await expect(introHeading).toBeVisible();

  await page.getByRole('button', { name: 'Use the Budget food tour idea', exact: true }).click();

  await expect(
    page.getByRole('heading', { level: 3, name: 'Your vibe', exact: true })
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Local classics', exact: true })
  ).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Build my itinerary now', exact: true }).click();

  const waitingDialog = page.getByRole('dialog', { name: 'Building your Saigon trip' });
  const conceptDialog = page.getByRole('dialog', { name: 'Your trip concept' });
  await expect(waitingDialog.or(conceptDialog)).toBeVisible({ timeout: 30_000 });
});
