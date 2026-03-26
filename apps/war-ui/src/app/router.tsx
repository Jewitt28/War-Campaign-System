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
import { CampaignWorkspacePage } from '../routes/pages/CampaignWorkspacePage'
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
                  element: <CampaignWorkspacePage />,
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
