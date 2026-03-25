package com.warcampaign.backend.service;

import com.warcampaign.backend.domain.model.Faction;
import com.warcampaign.backend.repository.FactionRepository;
import org.springframework.stereotype.Service;

@Service
public class FactionService extends CrudService<Faction> {

    public FactionService(FactionRepository repository) {
        super(repository);
    }
}
