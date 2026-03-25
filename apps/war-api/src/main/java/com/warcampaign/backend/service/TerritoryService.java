package com.warcampaign.backend.service;

import com.warcampaign.backend.domain.model.Territory;
import com.warcampaign.backend.repository.TerritoryRepository;
import org.springframework.stereotype.Service;

@Service
public class TerritoryService extends CrudService<Territory> {

    public TerritoryService(TerritoryRepository repository) {
        super(repository);
    }
}
