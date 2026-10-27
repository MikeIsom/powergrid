<template>
    <section
        :class="['auction-dock', { collapsed, 'my-turn': canBid || canChoose }]"
        aria-label="Power plant auction"
        data-auction-dock
    >
        <button type="button" class="dock-toggle" :aria-expanded="String(!collapsed)" @click="collapsed = !collapsed">
            <span class="dock-title">{{ title }}</span>
            <span v-if="collapsed && plant" class="dock-summary">
                #{{ plant.number }}<template v-if="currentBid"> · ${{ currentBid }}</template>
            </span>
            <svg class="chevron" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
                <path d="M3 10l5-5 5 5" fill="none" stroke="currentColor" stroke-width="2" />
            </svg>
        </button>

        <div v-show="!collapsed" class="dock-body">
            <!-- A plant is up: show it large with the standing bid. -->
            <div v-if="plant" class="auction-current">
                <svg class="dock-plant" viewBox="-2 -2 64 44" role="img" :aria-label="'Power plant ' + plant.number">
                    <Card :powerPlant="plant" />
                </svg>
                <div class="auction-status">
                    <div v-if="currentBid" class="high-bid">
                        <span class="label">High bid</span>
                        <span class="amount">${{ currentBid }}</span>
                    </div>
                    <div v-else class="high-bid">
                        <span class="label">Opening bid</span>
                        <span class="amount">${{ openingBid }}</span>
                    </div>
                    <span v-if="leader" class="leader" :style="{ backgroundColor: leader.color, color: leader.text }">{{
                        leader.name
                    }}</span>
                </div>
            </div>

            <!-- Your bid: type it, or nudge it, then commit. -->
            <form v-if="plant && canBid" class="bid-controls" @submit.prevent="submit">
                <div class="stepper">
                    <button type="button" class="step" :disabled="value <= minBid" @click="nudge(-5)">−5</button>
                    <button type="button" class="step" :disabled="value <= minBid" @click="nudge(-1)">−1</button>
                    <label class="bid-field">
                        <span class="sr-only">Your bid</span>
                        <span class="currency" aria-hidden="true">$</span>
                        <input
                            ref="input"
                            v-model="typed"
                            type="text"
                            inputmode="numeric"
                            pattern="[0-9]*"
                            autocomplete="off"
                            :aria-invalid="String(!valid)"
                            :aria-describedby="hintId"
                            @focus="$event.target.select()"
                        />
                    </label>
                    <button type="button" class="step" :disabled="value >= maxBid" @click="nudge(1)">+1</button>
                    <button type="button" class="step" :disabled="value >= maxBid" @click="nudge(5)">+5</button>
                </div>
                <p :id="hintId" :class="['bid-hint', { invalid: !valid }]">
                    <template v-if="!valid && maxBid < minBid">You can't afford ${{ minBid }}.</template>
                    <template v-else-if="!valid">Enter ${{ minBid }}–${{ maxBid }}.</template>
                    <template v-else>Min ${{ minBid }} · you have ${{ maxBid }}</template>
                </p>
                <div class="dock-actions">
                    <button v-if="canPass" type="button" class="secondary" @click="$emit('pass')">
                        {{ passLabel }}
                    </button>
                    <button type="submit" class="primary" :disabled="!valid">Bid ${{ valid ? value : '–' }}</button>
                </div>
            </form>

            <!-- Nothing up yet and it's your pick: the market as big tap targets. -->
            <div v-else-if="!plant && canChoose" class="choose-plant">
                <div class="market-scroll" role="list">
                    <button
                        v-for="option in market"
                        :key="option.plant.number"
                        type="button"
                        role="listitem"
                        class="market-card"
                        :disabled="!option.choosable"
                        :aria-label="'Auction power plant ' + option.plant.number"
                        @click="$emit('choose', option.plant)"
                    >
                        <svg viewBox="-2 -2 64 44" aria-hidden="true">
                            <Card :powerPlant="option.plant" :hasDiscount="option.discount" />
                        </svg>
                    </button>
                </div>
                <div v-if="canPass" class="dock-actions">
                    <button type="button" class="secondary" @click="$emit('pass')">{{ passLabel }}</button>
                </div>
            </div>

            <p v-else-if="plant" class="waiting">Waiting for other bids…</p>
        </div>
    </section>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from 'vue-property-decorator';
import type { PowerPlant } from 'powergrid-engine/src/gamestate';
import Card from './pieces/Card.vue';

let uid = 0;

/**
 * Phone auction controls. The SVG market scales down with the board, so its cards and
 * calculator end up thumb-sized; this sheet sits at the bottom of the screen with the
 * plant up for auction, a typed bid and full-size buttons.
 */
@Component({ components: { Card } })
export default class AuctionDock extends Vue {
    @Prop() plant?: PowerPlant;
    @Prop() currentBid?: number;
    @Prop() leader?: { name: string; color: string; text: string };
    @Prop({ default: false }) canBid!: boolean;
    @Prop({ default: false }) canChoose!: boolean;
    @Prop({ default: false }) canPass!: boolean;
    @Prop({ default: 'Pass' }) passLabel!: string;
    @Prop({ default: 0 }) minBid!: number;
    @Prop({ default: 0 }) maxBid!: number;
    @Prop() initialBid?: number;
    @Prop({ default: 0 }) openingBid!: number;
    @Prop({ default: () => [] }) market!: { plant: PowerPlant; choosable: boolean; discount: boolean }[];
    /** Changes when the bid floor should be re-read (new plant, rewind, bid edit). */
    @Prop({ default: '' }) resetKey!: string;

    collapsed = false;
    typed = '';
    hintId = 'auction-bid-hint-' + ++uid;
    private resizeObserver?: ResizeObserver;

    created() {
        this.reset();
    }

    mounted() {
        // Lets fixed overlays (the chat shortcut) sit above the sheet.
        if (typeof ResizeObserver !== 'undefined') {
            this.resizeObserver = new ResizeObserver(() => this.publishHeight());
            this.resizeObserver.observe(this.$el);
        }
        this.publishHeight();
    }

    beforeDestroy() {
        this.resizeObserver?.disconnect();
        document.documentElement.style.removeProperty('--pg-dock-height');
    }

    publishHeight() {
        document.documentElement.style.setProperty('--pg-dock-height', `${(this.$el as HTMLElement).offsetHeight}px`);
    }

    get title() {
        if (this.plant) return this.canBid ? 'Your bid' : 'Current auction';
        return this.canChoose ? 'Choose a plant to auction' : 'Auction';
    }

    get value(): number {
        return Number.parseInt(this.typed, 10);
    }

    get valid() {
        return /^\d+$/.test(this.typed.trim()) && this.value >= this.minBid && this.value <= this.maxBid;
    }

    @Watch('resetKey')
    reset() {
        const start = this.initialBid ?? this.minBid;
        this.typed = String(Math.min(this.maxBid, Math.max(this.minBid, start)));
    }

    // A rival's bid can lift the floor while you are deciding; lift a stale value with it.
    @Watch('minBid')
    onMinBid() {
        if (!(this.value >= this.minBid)) this.typed = String(this.minBid);
    }

    nudge(delta: number) {
        const base = Number.isFinite(this.value) ? this.value : this.minBid;
        this.typed = String(Math.min(this.maxBid, Math.max(this.minBid, base + delta)));
    }

    submit() {
        if (!this.valid) return;
        (this.$refs.input as HTMLInputElement | undefined)?.blur();
        this.$emit('bid', this.value);
    }
}
</script>

<style scoped>
.auction-dock {
    position: sticky;
    bottom: 0;
    z-index: 15;
    box-sizing: border-box;
    width: 100%;
    padding: 0 12px calc(12px + env(safe-area-inset-bottom));
    background: var(--pg-panel);
    color: var(--pg-ink);
    border-top: 1px solid var(--pg-border);
    border-radius: 14px 14px 0 0;
    box-shadow: 0 -6px 20px rgba(15, 22, 30, 0.25);
    font: 15px Arial, sans-serif;
    -webkit-tap-highlight-color: transparent;
}
.auction-dock.my-turn {
    border-top: 3px solid var(--pg-highlight);
}
.auction-dock.collapsed {
    padding-bottom: env(safe-area-inset-bottom);
}
.dock-toggle {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    min-height: 44px;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: 700 16px Arial, sans-serif;
    text-align: left;
    cursor: pointer;
}
.dock-title {
    flex: 1;
}
.dock-summary {
    font-weight: 600;
    color: var(--pg-ink-muted);
}
.chevron {
    transform: rotate(180deg);
    transition: transform 0.15s;
}
.collapsed .chevron {
    transform: none;
}
.auction-current {
    display: flex;
    align-items: center;
    gap: 14px;
}
.dock-plant {
    width: 132px;
    height: 88px;
    flex: none;
    overflow: visible;
}
.auction-status {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
}
.high-bid .label {
    display: block;
    font-size: 13px;
    color: var(--pg-ink-muted);
}
.high-bid .amount {
    font-size: 30px;
    font-weight: 700;
    line-height: 1.1;
}
.leader {
    padding: 2px 8px;
    border-radius: 4px;
    font-weight: 700;
    max-width: 50vw;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.bid-controls {
    margin-top: 12px;
}
.stepper {
    display: flex;
    align-items: stretch;
    gap: 6px;
}
.step {
    flex: none;
    width: 48px;
    min-height: 48px;
    border: 1px solid var(--pg-border);
    border-radius: 8px;
    background: var(--pg-panel-alt);
    color: var(--pg-ink);
    font: 700 16px Arial, sans-serif;
    cursor: pointer;
}
.step:disabled {
    opacity: 0.4;
    cursor: default;
}
.bid-field {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    border: 2px solid var(--pg-ink);
    border-radius: 8px;
    background: #fff;
    color: #1f2a36;
}
.bid-field:focus-within {
    outline: 3px solid var(--pg-accent);
    outline-offset: 1px;
}
.currency {
    padding-left: 10px;
    font: 700 22px Arial, sans-serif;
}
.bid-field input {
    width: 100%;
    min-width: 0;
    height: 44px;
    padding: 0 8px 0 2px;
    border: 0;
    outline: none;
    background: transparent;
    color: inherit;
    /* 16px or more keeps iOS from zooming the page on focus. */
    font: 700 24px Arial, sans-serif;
    text-align: center;
}
.bid-field input[aria-invalid='true'] {
    color: #c8102e;
}
.bid-hint {
    margin: 6px 0 0;
    font-size: 13px;
    text-align: center;
    color: var(--pg-ink-muted);
}
.bid-hint.invalid {
    color: #c8102e;
    font-weight: 600;
}
.dock-actions {
    display: flex;
    gap: 8px;
    margin-top: 10px;
}
.dock-actions button {
    flex: 1;
    min-height: 48px;
    border-radius: 8px;
    font: 700 17px Arial, sans-serif;
    cursor: pointer;
}
.primary {
    flex: 2 !important;
    border: 1px solid var(--pg-strong);
    background: var(--pg-strong);
    color: #fff;
}
.primary:disabled {
    opacity: 0.45;
    cursor: default;
}
.secondary {
    border: 1px solid var(--pg-border);
    background: var(--pg-panel-alt);
    color: var(--pg-ink);
}
.dock-actions button:focus-visible,
.step:focus-visible,
.market-card:focus-visible,
.dock-toggle:focus-visible {
    outline: 3px solid var(--pg-accent);
    outline-offset: 2px;
}
/* Four across fits a 360px phone at ~80px a card; Manhattan's 8-plant market wraps. */
.market-scroll {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
    padding: 4px 0 6px;
}
.market-card {
    aspect-ratio: 64 / 44;
    padding: 2px;
    border: 3px solid var(--pg-accent);
    border-radius: 10px;
    background: transparent;
    cursor: pointer;
}
.market-card:disabled {
    border-color: transparent;
    opacity: 0.45;
    cursor: default;
}
.market-card svg {
    width: 100%;
    height: 100%;
    overflow: visible;
}
.waiting {
    margin: 10px 0 0;
    color: var(--pg-ink-muted);
}
.sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
}
</style>
