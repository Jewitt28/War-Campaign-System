package com.warcampaign.backend.service;

import com.warcampaign.backend.domain.model.Campaign;
import com.warcampaign.backend.repository.CampaignRepository;
import org.springframework.stereotype.Service;

@Service
public class CampaignService extends CrudService<Campaign> {

    public CampaignService(CampaignRepository repository) {
        super(repository);
    }
}
