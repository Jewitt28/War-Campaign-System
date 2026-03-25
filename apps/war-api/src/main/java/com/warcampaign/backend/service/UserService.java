package com.warcampaign.backend.service;

import com.warcampaign.backend.domain.model.User;
import com.warcampaign.backend.repository.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class UserService extends CrudService<User> {

    public UserService(UserRepository repository) {
        super(repository);
    }
}
