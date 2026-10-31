/**
 * Import this FIRST in a spec that tests the rate limit. The config module reads the environment the moment the app
 * module is imported, so the limits must be set before that import, and an ES import is the only thing that is
 * guaranteed to run before the ones below it.
 */
export const GENERAL_LIMIT = 20;
export const LOGIN_LIMIT = 5;

process.env.THROTTLE_LIMIT = String(GENERAL_LIMIT);
process.env.THROTTLE_LOGIN_LIMIT = String(LOGIN_LIMIT);
