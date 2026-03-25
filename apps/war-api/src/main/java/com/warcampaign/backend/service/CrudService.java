package com.warcampaign.backend.service;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Transactional
public abstract class CrudService<T> {

    private final JpaRepository<T, UUID> repository;

    protected CrudService(JpaRepository<T, UUID> repository) {
        this.repository = repository;
    }

    public T save(T entity) {
        return repository.save(entity);
    }

    @Transactional(readOnly = true)
    public Optional<T> findById(UUID id) {
        return repository.findById(id);
    }

    @Transactional(readOnly = true)
    public List<T> findAll() {
        return repository.findAll();
    }

    public void deleteById(UUID id) {
        repository.deleteById(id);
    }
}
