package com.warcampaign.backend.service;

import com.warcampaign.backend.domain.model.CampaignMember;
import com.warcampaign.backend.repository.CampaignMemberRepository;
import org.springframework.stereotype.Service;

@Service
public class CampaignMemberService extends CrudService<CampaignMember> {

    public CampaignMemberService(CampaignMemberRepository repository) {
        super(repository);
    }
}
