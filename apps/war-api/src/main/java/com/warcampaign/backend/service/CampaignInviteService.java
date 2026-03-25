package com.warcampaign.backend.service;

import com.warcampaign.backend.domain.model.CampaignInvite;
import com.warcampaign.backend.repository.CampaignInviteRepository;
import org.springframework.stereotype.Service;

@Service
public class CampaignInviteService extends CrudService<CampaignInvite> {

    public CampaignInviteService(CampaignInviteRepository repository) {
        super(repository);
    }
}
