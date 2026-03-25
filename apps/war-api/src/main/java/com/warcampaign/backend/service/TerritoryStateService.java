package com.warcampaign.backend.service;

import com.warcampaign.backend.domain.model.TerritoryState;
import com.warcampaign.backend.repository.TerritoryStateRepository;
import org.springframework.stereotype.Service;

@Service
public class TerritoryStateService extends CrudService<TerritoryState> {

    public TerritoryStateService(TerritoryStateRepository repository) {
        super(repository);
    }
}
