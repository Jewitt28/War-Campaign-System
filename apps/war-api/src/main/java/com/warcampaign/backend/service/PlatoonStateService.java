package com.warcampaign.backend.service;

import com.warcampaign.backend.domain.model.PlatoonState;
import com.warcampaign.backend.repository.PlatoonStateRepository;
import org.springframework.stereotype.Service;

@Service
public class PlatoonStateService extends CrudService<PlatoonState> {

    public PlatoonStateService(PlatoonStateRepository repository) {
        super(repository);
    }
}
