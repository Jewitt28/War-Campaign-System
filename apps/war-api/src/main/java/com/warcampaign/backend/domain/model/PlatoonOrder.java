package com.warcampaign.backend.domain.model;

import com.warcampaign.backend.domain.enums.PlatoonOrderType;
import com.warcampaign.backend.domain.enums.PlatoonOrderValidationStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

import java.time.Instant;

@Entity
@Table(name = "platoon_order",
        uniqueConstraints = @UniqueConstraint(name = "uq_platoon_order_submission_platoon",
                columnNames = {"order_submission_id", "platoon_id"}))
public class PlatoonOrder extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_submission_id", nullable = false)
    private OrderSubmission orderSubmission;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "platoon_id", nullable = false)
    private Platoon platoon;

    @Enumerated(EnumType.STRING)
    @Column(name = "order_type", nullable = false, length = 30)
    private PlatoonOrderType orderType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "source_territory_id")
    private Territory sourceTerritory;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_territory_id")
    private Territory targetTerritory;

    @Column(name = "payload_json", columnDefinition = "TEXT")
    private String payloadJson;

    @Enumerated(EnumType.STRING)
    @Column(name = "validation_status", nullable = false, length = 20)
    private PlatoonOrderValidationStatus validationStatus;

    @Column(name = "validation_errors_json", columnDefinition = "TEXT")
    private String validationErrorsJson;

    @Column(name = "created_at", nullable = false, insertable = false, updatable = false)
    private Instant createdAt;

    public OrderSubmission getOrderSubmission() {
        return orderSubmission;
    }

    public void setOrderSubmission(OrderSubmission orderSubmission) {
        this.orderSubmission = orderSubmission;
    }

    public Platoon getPlatoon() {
        return platoon;
    }

    public void setPlatoon(Platoon platoon) {
        this.platoon = platoon;
    }

    public PlatoonOrderType getOrderType() {
        return orderType;
    }

    public void setOrderType(PlatoonOrderType orderType) {
        this.orderType = orderType;
    }

    public Territory getSourceTerritory() {
        return sourceTerritory;
    }

    public void setSourceTerritory(Territory sourceTerritory) {
        this.sourceTerritory = sourceTerritory;
    }

    public Territory getTargetTerritory() {
        return targetTerritory;
    }

    public void setTargetTerritory(Territory targetTerritory) {
        this.targetTerritory = targetTerritory;
    }

    public String getPayloadJson() {
        return payloadJson;
    }

    public void setPayloadJson(String payloadJson) {
        this.payloadJson = payloadJson;
    }

    public PlatoonOrderValidationStatus getValidationStatus() {
        return validationStatus;
    }

    public void setValidationStatus(PlatoonOrderValidationStatus validationStatus) {
        this.validationStatus = validationStatus;
    }

    public String getValidationErrorsJson() {
        return validationErrorsJson;
    }

    public void setValidationErrorsJson(String validationErrorsJson) {
        this.validationErrorsJson = validationErrorsJson;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
