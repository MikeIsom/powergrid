<template>
    <g v-if="powerPlant.number == 99" :id="elId" :transform="`translate(${currentX}, ${currentY})`">
        <rect width="60" height="40" :fill="getColor()" stroke="black" stroke-width="2" rx="4" />
        <text text-anchor="middle" x="30" y="20" fill="black">Step 3</text>
    </g>
    <g
        v-else
        :id="elId"
        :class="[{ canClick: canClick }, activationState && 'plant-' + activationState]"
        :data-activation="activationState"
        :transform="`translate(${currentX}, ${currentY})`"
        @click="canClick && $emit('click')"
    >
        <title v-if="activationState">{{ activationLabel }}</title>
        <rect
            width="60"
            height="40"
            :fill="getColor()"
            :stroke="hasDiscount ? 'palegreen' : 'black'"
            stroke-width="2"
            rx="4"
        />
        <g v-if="hasDiscount">
            <rect width="12" height="12" rx="4" fill="palegreen" />
            <text text-anchor="middle" x="6" y="6" style="font-size: 12px" fill="black">$</text>
        </g>
        <g transform="translate(30, 10)">
            <text text-anchor="middle" x="1" y="1" fill="gray">{{ powerPlant.number }}</text>
            <text text-anchor="middle" fill="white">{{ powerPlant.number }}</text>
        </g>

        <g :id="elId" :class="['piece']" transform="translate(40, 20) scale(0.035)">
            <path
                d="M187.698 263.636V456.017L3 341.204V169.522L80.8579 108.141L187.698 263.636Z"
                fill="white"
                stroke="white"
                stroke-width="12"
                stroke-miterlimit="10"
            />
            <path
                d="M395.724 136.361V300.164L187.698 456.017V263.636L395.724 136.361Z"
                fill="white"
                stroke="white"
                stroke-width="12"
                stroke-miterlimit="10"
            />
            <path
                d="M395.724 136.361L187.698 263.636L80.8579 108.141L304.771 4L395.724 136.361Z"
                fill="white"
                stroke="white"
                stroke-width="12"
                stroke-miterlimit="10"
            />
        </g>
        <text text-anchor="middle" x="47" y="28" style="font-size: 12px" fill="black">
            {{ powerPlant.citiesPowered }}
        </text>

        <text
            v-if="powerPlant.cost > 0"
            text-anchor="middle"
            x="6.5"
            y="27.5"
            style="font-size: 12px"
            font-weight="700"
            fill="white"
        >
            {{ powerPlant.cost }}
        </text>
        <g :transform="isHybrid() ? 'translate(11.5, 22.5) scale(0.6)' : 'translate(12, 21.5) scale(0.78)'">
            <path :d="getResourcePath()" fill="white" />
        </g>

        <g transform="translate(24, 22)">
            <path d="M0,3 L8,3 L8,0 L14,6 L8,12 L8,9 L0,9Z" fill="white" />
        </g>

        <g v-if="activationState === 'used'" class="plant-activation-badge" pointer-events="none">
            <circle cx="56" cy="3" r="8" fill="#183b32" stroke="#e0f2b9" stroke-width="1.5" />
            <path
                d="M52 3 L55 6 L60 0"
                fill="none"
                stroke="#e0f2b9"
                stroke-width="2.2"
                stroke-linecap="round"
                stroke-linejoin="round"
            />
        </g>
        <defs>
            <linearGradient id="hybrid" x1="0" y1="0" x2="100%" y2="100%">
                <stop offset="50%" stop-color="#6b4226" />
                <stop offset="50%" stop-color="#2b2f38" />
            </linearGradient>
            <linearGradient id="garbageOilHybrid" x1="0" y1="0" x2="100%" y2="100%">
                <stop offset="50%" stop-color="#9a7a12" />
                <stop offset="50%" stop-color="#2b2f38" />
            </linearGradient>
        </defs>
    </g>
</template>
<script lang="ts">
import { PieceType } from './../../types/ui-data';
import { PowerPlant, PowerPlantType } from 'powergrid-engine/src/gamestate';
import { Component, Mixins, Prop } from 'vue-property-decorator';
import Piece from './Piece.vue';

@Component({
    created(this: Card) {
        this.pieceType = PieceType.Card;
    }
})
export default class Card extends Mixins(Piece) {
    @Prop()
    owner?: number;

    @Prop()
    powerPlant?: PowerPlant;

    @Prop()
    canClick?: boolean;

    @Prop({ default: false })
    hasDiscount?: boolean;

    @Prop()
    activationState?: 'used' | 'unavailable' | 'ready' | 'idle';

    get activationLabel() {
        return this.activationState === 'used' ? 'Activated' :
            this.activationState === 'unavailable' ? 'Not enough fuel' :
            this.activationState === 'ready' ? 'Ready to activate' : 'Not activated';
    }

    getColor() {
        switch (this.powerPlant?.type) {
            case PowerPlantType.Coal: return '#6b4226';
            case PowerPlantType.Oil: return '#2b2f38';
            case PowerPlantType.Garbage: return '#9a7a12';
            case PowerPlantType.Uranium: return '#c8102e';
            case PowerPlantType.Hybrid: return 'url(#hybrid)';
            case PowerPlantType.Wind: return '#00805f';
            case PowerPlantType.Nuclear: return '#0072b2';
            case PowerPlantType.Step3: return '#0072b2';
            case PowerPlantType.GarbageOilHybrid: return 'url(#garbageOilHybrid)';
        }
    }

    isHybrid() {
        return this.powerPlant?.type === PowerPlantType.Hybrid || this.powerPlant?.type === PowerPlantType.GarbageOilHybrid;
    }

    // Silhouettes of the resource tokens, so a plant's fuel reads by shape as well as colour.
    getResourcePath() {
        switch (this.powerPlant?.type) {
            case PowerPlantType.Coal: return 'M1.9,6 L5.3,1.9 L10.1,1.1 L13.9,4.5 L13.1,10.9 L8.3,13.9 L2.6,12Z';
            case PowerPlantType.Oil: return 'M7.5,0.5 C7.5,0.5 2.8,6.5 2.8,9.6 A4.7,4.7 0 0,0 12.2,9.6 C12.2,6.5 7.5,0.5 7.5,0.5Z';
            case PowerPlantType.Garbage: return 'M2,2 H13 V4.4 H2Z M3,5 H12 L11,14 H4Z';
            case PowerPlantType.Uranium: return 'M3.5,4 A4,4 0 0,1 11.5,4 V11 A4,4 0 0,1 3.5,11Z';
            case PowerPlantType.Hybrid: return 'M1.9,6 L5.3,1.9 L10.1,1.1 L13.9,4.5 L13.1,10.9 L8.3,13.9 L2.6,12Z M15,0.5 C15,0.5 10.3,6.5 10.3,9.6 A4.7,4.7 0 0,0 19.7,9.6 C19.7,6.5 15,0.5 15,0.5Z';
            case PowerPlantType.Wind: return '';
            case PowerPlantType.Nuclear: return '';
            case PowerPlantType.Step3: return '';
            case PowerPlantType.GarbageOilHybrid: return 'M2,2 H13 V4.4 H2Z M3,5 H12 L11,14 H4Z M15,0.5 C15,0.5 10.3,6.5 10.3,9.6 A4.7,4.7 0 0,0 19.7,9.6 C19.7,6.5 15,0.5 15,0.5Z';
        }
    }
}
</script>
<style lang="scss">
.plant-used > rect:first-of-type {
    stroke: #183b32;
    stroke-width: 3px;
}
.canClick {
    cursor: pointer;
}
</style>
