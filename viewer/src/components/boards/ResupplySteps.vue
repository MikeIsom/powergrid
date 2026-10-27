<template>
    <g class="resupply-steps">
        <g
            v-for="step in 3"
            :key="step"
            :transform="`translate(${(step - 1) * 38}, 0)`"
            :opacity="step < current && selected !== step ? 0.45 : 1"
            role="button"
            tabindex="0"
            :aria-label="`Step: ${step}`"
            :aria-pressed="selected === step ? 'true' : 'false'"
            :data-resupply-step="step"
            style="cursor: pointer"
            @click="$emit('select', step)"
            @keydown.enter.prevent="$emit('select', step)"
            @keydown.space.prevent="$emit('select', step)"
        >
            <title>Step: {{ step }}</title>
            <rect
                width="34"
                height="28"
                rx="5"
                :fill="selected === step ? '#b8c4d2' : '#e4eaf1'"
                :stroke="selected === step ? '#3f4c5c' : '#5b6b7f'"
                :stroke-width="selected === step ? 2 : 1"
            />
            <text
                x="17"
                y="15"
                text-anchor="middle"
                dominant-baseline="middle"
                fill="#26351a"
                style="font: bold 14px Arial"
                >S{{ step }}</text
            >
            <line v-if="current === step" x1="9" x2="25" y1="25" y2="25" stroke="#e69f00" stroke-width="2" />
        </g>
    </g>
</template>
<script lang="ts">
import { Vue, Component, Prop } from 'vue-property-decorator';
@Component
export default class ResupplySteps extends Vue {
    @Prop({ required: true }) selected!: number;
    @Prop({ required: true }) current!: number;
}
</script>
