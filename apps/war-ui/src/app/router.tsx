import { createBrowserRouter } from 'react-router-dom'
import {
  AppShellLayout,
  AuthenticatedRoute,
  CampaignMembershipRoute,
  GmOnlyRoute,
  PublicLayout,
  RootRedirect,
} from '../routes/layouts'
import { CampaignsPage } from '../routes/pages/CampaignsPage'
import { CampaignDashboardPage } from '../routes/pages/CampaignDashboardPage'
import { CampaignIndexRedirect } from '../routes/pages/CampaignIndexRedirect'
import { CampaignLobbyPage } from '../routes/pages/CampaignLobbyPage'
import { CampaignMapPage } from '../routes/pages/CampaignMapPage'
import { CampaignWorkspaceLayout } from '../routes/pages/CampaignWorkspaceLayout'
import { GmAdminPlaceholderPage } from '../routes/pages/GmAdminPlaceholderPage'
import { InvitePage } from '../routes/pages/InvitePage'
import { LoginPage } from '../routes/pages/LoginPage'

export const router = createBrowserRouter(
  [
    {
      path: '/',
      element: <RootRedirect />,
    },
    {
      element: <PublicLayout />,
      children: [
        {
          path: '/login',
          element: <LoginPage />,
        },
        {
          path: '/invite/:token',
          element: <InvitePage />,
        },
      ],
    },
    {
      path: '/app',
      element: <AuthenticatedRoute />,
      children: [
        {
          element: <AppShellLayout />,
          children: [
            {
              path: 'campaigns',
              element: <CampaignsPage />,
            },
            {
              path: 'campaigns/:campaignId',
              element: <CampaignMembershipRoute />,
              children: [
                {
                  index: true,
                  element: <CampaignIndexRedirect />,
                },
                {
                  element: <CampaignWorkspaceLayout />,
                  children: [
                    {
                      path: 'lobby',
                      element: <CampaignLobbyPage />,
                    },
                    {
                      path: 'dashboard',
                      element: <CampaignDashboardPage />,
                    },
                    {
                      path: 'map',
                      element: <CampaignMapPage />,
                    },
                  ],
                },
                {
                  path: 'admin',
                  element: <GmOnlyRoute />,
                  children: [
                    {
                      index: true,
                      element: <GmAdminPlaceholderPage />,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
  {
    basename: import.meta.env.BASE_URL,
  },
)
