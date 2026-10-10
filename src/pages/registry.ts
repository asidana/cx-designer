/**
 * Page registry — maps a page id from `navigation/navModel` to its component.
 *
 * Designer pages render inside App because they own canvas state; everything
 * else is self-contained and mounts here.
 */

import type React from 'react';
import { guardrailsPages } from './GuardrailsPages';
import { gatewayPages } from './GatewayPages';
import { observabilityPages } from './ObservabilityPages';
import { insightsPages } from './InsightsPages';
import { settingsPages } from './SettingsPages';
import { adminPages } from './AdminPages';
import { superAdminPages } from './SuperAdminPages';
import { helpPages } from './HelpPages';
import type { PageContext } from './context';

export const PAGES: Record<string, React.FC<PageContext>> = {
  ...guardrailsPages,
  ...gatewayPages,
  ...observabilityPages,
  ...insightsPages,
  ...settingsPages,
  ...adminPages,
  ...superAdminPages,
  ...helpPages
};

export type { PageContext };