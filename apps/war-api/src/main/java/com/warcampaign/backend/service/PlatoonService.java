package com.warcampaign.backend.service;

import com.warcampaign.backend.domain.model.Platoon;
import com.warcampaign.backend.repository.PlatoonRepository;
import org.springframework.stereotype.Service;

@Service
public class PlatoonService extends CrudService<Platoon> {

    public PlatoonService(PlatoonRepository repository) {
        super(repository);
    }
}
