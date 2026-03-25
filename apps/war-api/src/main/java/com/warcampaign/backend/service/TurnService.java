package com.warcampaign.backend.service;

import com.warcampaign.backend.domain.model.Turn;
import com.warcampaign.backend.repository.TurnRepository;
import org.springframework.stereotype.Service;

@Service
public class TurnService extends CrudService<Turn> {

    public TurnService(TurnRepository repository) {
        super(repository);
    }
}
