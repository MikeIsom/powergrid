<template>
    <!-- Same 125×50 footprint as before: the desktop layout reserves exactly this. -->
    <g class="calculator">
        <rect width="125" height="50" rx="4" />
        <g :class="['step', { disabled: value >= maxValue }]" @click="add()">
            <rect x="46" y="6" width="19" height="18" rx="3" />
            <text x="55.5" y="15.5" text-anchor="middle">+1</text>
            <title>Raise bid by 1</title>
        </g>
        <g :class="['step', { disabled: value <= minValue }]" @click="sub()">
            <rect x="46" y="26" width="19" height="18" rx="3" />
            <text x="55.5" y="35.5" text-anchor="middle">−1</text>
            <title>Lower bid by 1</title>
        </g>
        <g :class="['step', { disabled: value >= maxValue }]" @click="step(5)">
            <rect x="67" y="6" width="19" height="18" rx="3" />
            <text x="76.5" y="15.5" text-anchor="middle">+5</text>
            <title>Raise bid by 5</title>
        </g>
        <g :class="['step', { disabled: value <= minValue }]" @click="step(-5)">
            <rect x="67" y="26" width="19" height="18" rx="3" />
            <text x="76.5" y="35.5" text-anchor="middle">−5</text>
            <title>Lower bid by 5</title>
        </g>
        <foreignObject x="5" y="6" width="38" height="38">
            <input
                class="visor"
                :class="{ invalid: !valid }"
                type="text"
                inputmode="numeric"
                pattern="[0-9]*"
                autocomplete="off"
                aria-label="Your bid"
                :title="`Bid $${minValue}–$${maxValue}`"
                :value="text"
                @input="onInput"
                @focus="$event.target.select()"
                @keydown.enter.prevent="bid()"
                @keydown.up.prevent="add()"
                @keydown.down.prevent="sub()"
            />
        </foreignObject>
        <g :class="['ok', { disabled: !valid }]" @click="bid()">
            <rect class="button" x="89" y="6" width="31" height="38" rx="3" />
            <text x="104.5" y="25" text-anchor="middle">OK</text>
        </g>
    </g>
</template>
<script lang="ts">
import { Vue, Component, Prop, Watch } from 'vue-property-decorator';

@Component({
    created(this: Calculator) {
        this.value = Math.min(this.maxValue, Math.max(this.minValue, this.initialValue ?? this.minValue));
    },
})
export default class Calculator extends Vue {
    @Prop()
    minValue;

    @Prop()
    maxValue;

    @Prop() initialValue?: number;

    value: number = 0;
    /** What the player is typing; null while the visor just shows `value`. */
    draft: string | null = null;

    get text() {
        return this.draft ?? String(this.value);
    }

    get valid() {
        if (this.draft === null) return this.value >= this.minValue && this.value <= this.maxValue;
        const typed = Number.parseInt(this.draft, 10);
        return /^\d+$/.test(this.draft.trim()) && typed >= this.minValue && typed <= this.maxValue;
    }

    // The legal floor can rise while the calculator is open (e.g. a rival bid in a
    // classic auction). Lift a stale value to the floor; never lower a dialed-in bid.
    @Watch('minValue')
    onMinValueChanged() {
        this.value = Math.max(this.value, this.minValue);
        if (this.draft !== null && !this.valid) this.draft = null;
    }

    onInput(event: InputEvent) {
        this.draft = (event.target as HTMLInputElement).value;
        if (this.valid) this.value = Number.parseInt(this.draft, 10);
    }

    step(delta: number) {
        this.value = Math.min(this.maxValue, Math.max(this.minValue, this.value + delta));
        this.draft = null;
    }

    add() {
        this.step(1);
    }

    sub() {
        this.step(-1);
    }

    bid() {
        if (!this.valid) return;
        this.draft = null;
        this.$emit('bid', this.value);
    }
}
</script>
<style lang="scss">
.calculator {
    fill: #1f2a36;

    .step,
    .ok {
        cursor: pointer;

        rect {
            fill: #4a5a6e;
        }

        text {
            fill: #fff;
            font-size: 11px;
            font-weight: 700;
        }

        &:hover rect {
            fill: #5b6b7f;
        }

        &.disabled {
            cursor: default;
            opacity: 0.4;

            &:hover rect {
                fill: #4a5a6e;
            }
        }
    }

    .ok {
        rect {
            fill: #e9edf2;
        }

        text {
            fill: #1f2a36;
            font-size: 13px;
        }

        &:hover rect {
            fill: #ffffff;
        }

        &.disabled:hover rect {
            fill: #e9edf2;
        }
    }

    .visor {
        box-sizing: border-box;
        width: 100%;
        height: 100%;
        padding: 0;
        border: 0;
        border-radius: 3px;
        background: #fff;
        color: #1f2a36;
        font: 700 16px system-ui, Arial, sans-serif;
        text-align: center;

        &:focus {
            outline: 2px solid #56b4e9;
            outline-offset: 0;
        }

        &.invalid {
            color: #c8102e;
        }
    }
}
</style>
