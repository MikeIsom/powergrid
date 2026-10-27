<template>
    <g class="player-board">
        <rect
            width="350"
            :height="100 + (showAutoPass ? settingRowHeight : 0)"
            x="0"
            y="0"
            fill="#e9edf2"
            :stroke="color"
        />
        <rect width="350" height="25" x="0" y="0" :fill="color" />
        <foreignObject height="30" width="30" x="-30" y="-5">
            <img
                :src="avatar || `https://avatars.dicebear.com/api/pixel-art/${player.name}.svg`"
                width="100%"
                height="100%"
                style="border-radius: 50%"
            />
        </foreignObject>
        <image
            v-if="supporterBadge"
            :href="supporterBadge.url"
            x="5"
            y="4"
            width="17"
            height="17"
            :aria-label="supporterBadge.label"
        >
            <title>{{ supporterBadge.label }}</title>
        </image>
        <text
            :data-bgs-player="owner"
            style="pointer-events: all"
            tabindex="0"
            :x="supporterBadge ? 27 : 5"
            y="13"
            font-weight="600"
            :fill="colorText(color)"
        >
            {{ getPlayerName() }}
        </text>
        <g class="board-stats" :fill="colorText(color)">
            <g transform="translate(222, 5)">
                <path d="M6.5,0.5 L13,6 V15 H0 V6Z" transform="scale(0.95)" />
                <text x="16" y="8" font-weight="700">{{ player.cities.length }}</text>
                <title>{{ player.cities.length }} cities connected</title>
            </g>
            <g transform="translate(262, 4)">
                <path d="M8,0 L1,10 H6 L4.5,17 L12,6.5 H7 L9,0Z" />
                <text x="15" y="9" font-weight="700">{{ plantCapacity }}</text>
                <title>Plants can power up to {{ plantCapacity }} cities</title>
            </g>
            <text v-if="showMoney" x="345" y="13" text-anchor="end" font-weight="700">${{ player.money }}</text>
        </g>

        <!-- Keep the full preference inside the viewer's own player card. -->
        <template v-if="showAutoPass">
            <g
                class="auction-auto-pass"
                :class="{ editable: !autoPassDisabled }"
                transform="translate(0, 100)"
                data-auction-auto-pass
                :role="autoPassPublic ? 'note' : 'checkbox'"
                :aria-checked="autoPassPublic ? undefined : String(autoPass)"
                :aria-disabled="autoPassDisabled ? 'true' : 'false'"
                :tabindex="autoPassPublic || autoPassDisabled ? -1 : 0"
                aria-label="Auto-pass if unaffordable"
                @click="!autoPassDisabled && $emit('toggleAutoPass')"
                @keydown.enter.prevent="!autoPassDisabled && $emit('toggleAutoPass')"
                @keydown.space.prevent="!autoPassDisabled && $emit('toggleAutoPass')"
            >
                <rect class="auto-pass-hit" width="350" :height="settingRowHeight" fill="transparent" />
                <path d="M0 0H350" stroke="#5b6b7f" stroke-opacity="0.35" />
                <rect
                    x="10"
                    y="9"
                    width="18"
                    height="18"
                    rx="2"
                    :fill="autoPass ? '#1f2a36' : '#ffffff'"
                    stroke="#1f2a36"
                />
                <path v-if="autoPass" d="M14 18L18 22L24 14" fill="none" stroke="white" stroke-width="2" />
                <text x="37" y="18" fill="#1f2a36" style="font: 16px Arial, sans-serif; dominant-baseline: central"
                    >Auto-pass if unaffordable</text
                >
                <title>
                    {{
                        autoPassPublic
                            ? 'Money is public: players automatically pass auctions they cannot afford.'
                            : 'Automatically pass auctions you cannot afford. With hidden money, this can reveal that you cannot afford the bid. Applies after the next move.'
                    }}
                </title>
            </g>
        </template>

        <Card
            v-for="(powerPlant, i) in player.powerPlants"
            :key="'powerPlant_' + powerPlant.number"
            :targetState="{ x: cardX(i), y: 30 }"
            :owner="owner"
            :powerPlant="powerPlant"
            :canClick="canUse(powerPlant)"
            :activationState="activationState(powerPlant)"
            :data-plant-number="powerPlant.number"
            @click="powerPlantClick(powerPlant)"
        />

        <!-- Open plant slots up to the hand limit. -->
        <rect
            v-for="i in emptySlots"
            :key="'emptySlot' + i"
            class="empty-plant-slot"
            :x="cardX(player.powerPlants.length + i - 1)"
            y="30"
            width="60"
            height="40"
            rx="4"
            fill="none"
            stroke="#8796a8"
            stroke-width="1.5"
            stroke-dasharray="4 3"
        />

        <!-- Fuel sitting on each plant, as on the physical cards: filled for a
             stored token, outlined for room left. Storage is pooled per type in the
             engine, so this fills dedicated plants first, then hybrids. -->
        <g
            v-for="(slots, i) in fuelOnPlants"
            :key="'fuel_' + i"
            class="plant-fuel"
            :transform="`translate(${cardX(i)}, 72)`"
        >
            <g
                v-for="(slot, j) in slots"
                :key="j"
                :transform="`translate(${fuelPipX(slots.length, j)}, 0) scale(0.55)`"
            >
                <path
                    :d="pipPath(slot.type)"
                    :fill="slot.filled ? pipColor(slot.type) : 'none'"
                    :stroke="slot.filled ? '#1f2a36' : '#8796a8'"
                    stroke-width="1.6"
                    stroke-linejoin="round"
                />
            </g>
        </g>

        <!-- Australia: mark uranium mines (they sell uranium instead of powering
             cities, and don't count toward the 3-plant limit) with a green frame
             and a uranium badge. -->
        <template v-for="(powerPlant, i) in player.powerPlants">
            <g v-if="isMine(powerPlant)" :key="'mine_' + powerPlant.number">
                <rect
                    :x="cardX(i)"
                    y="30"
                    width="60"
                    height="40"
                    fill="none"
                    stroke="#2e8b3d"
                    stroke-width="3px"
                    rx="3px"
                />
                <rect :x="cardX(i) + 42" y="28" width="18" height="19" rx="3" fill="#e4eaf1" stroke="#5b6b7f" />
                <Uranium
                    :pieceId="'uraniumMineBadge_' + powerPlant.number"
                    :targetState="{ x: cardX(i) + 41, y: 29 }"
                />
            </g>
        </template>

        <template>
            <template v-for="(powerPlant, i) in player.powerPlants">
                <rect
                    v-if="canUse(powerPlant)"
                    :key="i + '_' + i + '_helper'"
                    :x="cardX(i)"
                    :y="30"
                    width="60"
                    height="40"
                    fill="none"
                    :stroke="player.availableMoves && player.availableMoves.DiscardPowerPlant ? '#c62828' : 'blue'"
                    stroke-width="4px"
                    rx="2px"
                />
            </template>
        </template>

        <g v-if="canClickResources">
            <rect
                v-if="canClickResource('coal')"
                width="24"
                height="20"
                x="2"
                y="80"
                fill="none"
                stroke="blue"
                stroke-width="2px"
                rx="2px"
            />
            <rect
                v-if="canClickResource('oil')"
                width="24"
                height="20"
                x="72"
                y="80"
                fill="none"
                stroke="blue"
                stroke-width="2px"
                rx="2px"
            />
            <rect
                v-if="canClickResource('garbage')"
                width="24"
                height="20"
                x="142"
                y="80"
                fill="none"
                stroke="blue"
                stroke-width="2px"
                rx="2px"
            />
        </g>

        <g
            v-for="(stock, k) in fuelStock"
            :key="stock.resource"
            :class="['fuel-stock', { empty: !stock.left && !stock.capacity }]"
            :transform="`translate(${4 + 70 * k}, 81)`"
        >
            <g transform="scale(0.8)">
                <Coal
                    v-if="stock.resource === 'coal'"
                    :pieceId="'Coal' + player.id"
                    :targetState="{ x: 0, y: 0 }"
                    :canClick="canClickResource('coal')"
                    @click="clickResource('coal')"
                />
                <Oil
                    v-else-if="stock.resource === 'oil'"
                    :pieceId="'Oil' + player.id"
                    :targetState="{ x: 0, y: 0 }"
                    :canClick="canClickResource('oil')"
                    @click="clickResource('oil')"
                />
                <Garbage
                    v-else-if="stock.resource === 'garbage'"
                    :pieceId="'Garbage' + player.id"
                    :targetState="{ x: 0, y: 0 }"
                    :canClick="canClickResource('garbage')"
                    @click="clickResource('garbage')"
                />
                <Uranium v-else :pieceId="'Uranium' + player.id" :targetState="{ x: 0, y: 0 }" />
            </g>
            <text x="21" y="9" fill="#1f2a36">
                <tspan font-weight="700">{{ stock.left }}</tspan
                ><tspan fill="#5b6b7f" style="font-size: 12px">/{{ stock.capacity }}</tspan>
            </text>
            <title>{{ stock.title }}</title>
        </g>

        <!-- Time this player has spent on the clock. Ticks live while it is their
             turn; sits in the free space right of the resource counters. -->
        <text
            text-anchor="end"
            x="345"
            y="90"
            fill="#1f2a36"
            :font-weight="isCurrentPlayer ? 700 : 400"
            style="font-size: 13px"
        >
            {{ timeUsed }}
        </text>
    </g>
</template>
<script lang="ts">
import { playerSymbol } from "../player-colors";
import { colorText } from '../player-colors';
import { MoveName, Player } from 'powergrid-engine';
import { Phase, playerTimeUsed, PowerPlant, PowerPlantType, ResourceType } from 'powergrid-engine/src/gamestate';
import { Vue, Component, Prop, Inject } from 'vue-property-decorator';
import { Preferences } from '../types/ui-data';
import { formatDuration } from '../util/time';
import { PLAYER_SETTING_ROW_HEIGHT } from '../util/board-layout';
import { Coal, Oil, Garbage, Uranium, Card } from './pieces';

@Component({
    components: {
        Coal,
        Oil,
        Garbage,
        Uranium,
        Card
    }
})
export default class PlayerBoard extends Vue {
    colorText = colorText;
    @Prop() color?: string;
    @Prop() avatar?: string;
    @Prop() player!: Player;
    @Prop() isCurrentPlayer?: boolean;
    @Prop() owner?: number;
    @Prop() ended?: boolean;
    @Prop() isPlayer?: boolean;
    @Prop() ranking?: number;
    @Prop() showMoney?: boolean;
    @Prop() showBid?: boolean;
    @Prop() phase?: Phase;
    // Australia: uranium plants are "mines" — flag so the hand marks them distinctly.
    @Prop() isAustralia?: boolean;
    @Prop({ default: false }) showAutoPass!: boolean;
    @Prop({ default: false }) autoPass!: boolean;
    @Prop({ default: false }) autoPassPublic!: boolean;
    @Prop({ default: true }) autoPassDisabled!: boolean;
    /** Hand limit: 3 plants, 4 in a two-player game. */
    @Prop({ default: 3 }) plantSlots!: number;

    settingRowHeight = PLAYER_SETTING_ROW_HEIGHT;

    @Inject() preferences!: Preferences;

    get supporterBadge() {
        return this.owner !== undefined && this.preferences.bgs?.players?.[this.owner]?.pro
            ? this.preferences.bgs.supporterBadge
            : undefined;
    }

    powerPlantClicked?: PowerPlant;

    // Ticks the live clock. Kept in this component rather than in Game so the
    // per-second update only re-renders the player boards, not the whole board SVG.
    now = Date.now();
    private clockTimer?: number;

    mounted() {
        this.clockTimer = window.setInterval(() => (this.now = Date.now()), 1000);
    }

    beforeDestroy() {
        if (this.clockTimer != undefined) {
            window.clearInterval(this.clockTimer);
        }
    }

    // Total time this player has been on the clock, counting the stretch currently
    // running so the active player's timer visibly ticks up.
    get timeUsed(): string {
        return formatDuration(playerTimeUsed(this.player, this.now));
    }

    // Horizontal position of the i-th power-plant card. Spacing compresses as the
    // hand grows so Australia's mines (which don't count toward the 3-plant limit,
    // so a player can hold many cards) stay on the board instead of overflowing
    // off the right edge. Non-Australia hands never exceed 4, so they are unaffected.
    cardX(i: number): number {
        const n = this.player.powerPlants.length;
        if (n < 5) return 20 + 80 * i;
        return 5 + Math.min(70, 280 / (n - 1)) * i;
    }

    get emptySlots(): number {
        return Math.max(0, this.plantSlots - this.player.powerPlants.length);
    }

    get plantCapacity(): number {
        return this.player.powerPlants
            .filter((plant) => !this.isMine(plant))
            .reduce((sum, plant) => sum + plant.citiesPowered, 0);
    }

    get fuelStock() {
        const p = this.player;
        const garbageOil = p.garbageOilHybridCapacity || 0;
        const shared = (n: number) => (n ? ` (${n} shared with hybrid plants)` : '');
        return [
            { resource: 'coal', left: p.coalLeft, capacity: p.coalCapacity + p.hybridCapacity, extra: p.hybridCapacity },
            { resource: 'oil', left: p.oilLeft, capacity: p.oilCapacity + p.hybridCapacity + garbageOil, extra: p.hybridCapacity + garbageOil },
            { resource: 'garbage', left: p.garbageLeft, capacity: p.garbageCapacity + garbageOil, extra: garbageOil },
            { resource: 'uranium', left: p.uraniumLeft, capacity: p.uraniumCapacity, extra: 0 },
        ].map((stock) => ({
            ...stock,
            title: `${stock.resource[0].toUpperCase() + stock.resource.slice(1)}: ${stock.left} stored, room for ${
                stock.capacity
            }${shared(stock.extra)}`,
        }));
    }

    /** Storage slots per plant, filled from the pooled fuel: dedicated plants first, then hybrids. */
    get fuelOnPlants(): { type: string; filled: boolean }[][] {
        const left: Record<string, number> = {
            coal: this.player.coalLeft,
            oil: this.player.oilLeft,
            garbage: this.player.garbageLeft,
            uranium: this.player.uraniumLeft,
        };
        const single = ['coal', 'oil', 'garbage', 'uranium'];
        const take = (type: string, max: number) => {
            const n = Math.min(max, left[type]);
            left[type] -= n;
            return n;
        };
        const slots = this.player.powerPlants.map(() => [] as { type: string; filled: boolean }[]);
        const room = (plant: PowerPlant) =>
            plant.type === PowerPlantType.Garbage && plant.storage ? plant.storage : plant.cost * 2;
        this.player.powerPlants.forEach((plant, i) => {
            const type = single[plant.type];
            if (!type || this.isMine(plant) || plant.cost === 0) return;
            const filled = take(type, room(plant));
            for (let k = 0; k < room(plant); k++) slots[i].push({ type, filled: k < filled });
        });
        this.player.powerPlants.forEach((plant, i) => {
            const other = this.hybridFuel(plant);
            if (!other) return;
            const first = take(other, room(plant));
            const oil = take('oil', room(plant) - first);
            for (let k = 0; k < first; k++) slots[i].push({ type: other, filled: true });
            for (let k = 0; k < oil; k++) slots[i].push({ type: 'oil', filled: true });
            while (slots[i].length < room(plant)) slots[i].push({ type: 'hybrid', filled: false });
        });
        return slots;
    }

    fuelPipX(count: number, j: number): number {
        // Centre the strip under the 60-wide card; pips are ~8.5 wide.
        const step = 9.5;
        return 30 - (count * step) / 2 + j * step + 0.5;
    }

    pipPath(type: string): string {
        switch (type) {
            case 'coal': return 'M1.9,6 L5.3,1.9 L10.1,1.1 L13.9,4.5 L13.1,10.9 L8.3,13.9 L2.6,12Z';
            case 'oil': return 'M7.5,0.5 C7.5,0.5 2.8,6.5 2.8,9.6 A4.7,4.7 0 0,0 12.2,9.6 C12.2,6.5 7.5,0.5 7.5,0.5Z';
            case 'garbage': return 'M2,2 H13 V4.4 H2Z M3,5 H12 L11,14 H4Z';
            case 'uranium': return 'M3.5,4 A4,4 0 0,1 11.5,4 V11 A4,4 0 0,1 3.5,11Z';
            default: return 'M7.5,1.5 A6,6 0 1,1 7.49,1.5Z';
        }
    }

    pipColor(type: string): string {
        return ({ coal: '#8a5c3b', oil: '#1b1e25', garbage: '#e8c547', uranium: '#c8102e' } as Record<string, string>)[
            type
        ];
    }

    isMine(powerPlant: PowerPlant): boolean {
        return this.isAustralia === true && powerPlant.type === PowerPlantType.Uranium;
    }

    getPlayerName() {
        let name = '';
        if (this.isCurrentPlayer) {
            name += '• ';
        }

        if (this.preferences.colorBlind && this.owner !== undefined) name += `${playerSymbol(this.owner, this.preferences)} · `;
        name += this.player.name;

        if (this.ended) {
            switch (this.ranking) {
                case 1:
                    name += ' (1st)';
                    break;
                case 2:
                    name += ' (2nd)';
                    break;
                case 3:
                    name += ' (3rd)';
                    break;
                case 4:
                case 5:
                case 6:
                    name += ` (${this.ranking}th)`;
                    break;
            }
        } else if (this.player.skipAuction) {
            name += ' (Skipping)';
        } else if (this.player.passed) {
            name += ' (Passed)';
        } else if (this.player.bid && !this.isCurrentPlayer && this.showBid) {
            name += ' (Bid: $' + this.player.bid + ')';
        }

        return name;
    }

    activationState(plant: PowerPlant) {
        if (!this.isPlayer || this.phase !== Phase.Bureaucracy || this.isMine(plant)) return undefined;
        if (!this.player.powerPlantsNotUsed.includes(plant.number)) return 'used';
        const fuel = [this.player.coalLeft, this.player.oilLeft, this.player.garbageLeft,
            this.player.uraniumLeft, this.player.coalLeft + this.player.oilLeft];
        fuel[PowerPlantType.GarbageOilHybrid] = this.player.garbageLeft + this.player.oilLeft;
        if (plant.cost > 0 && fuel[plant.type] < plant.cost) return 'unavailable';
        return this.canUse(plant) ? 'ready' : 'idle';
    }

    canUse(powerPlant: PowerPlant) {
        if (!this.isCurrentPlayer) return false;
        const moves = this.player.availableMoves;
        if (moves?.DiscardPowerPlant) return moves.DiscardPowerPlant.includes(powerPlant.number);
        return this.player.resourcesUsed.length === 0 &&
            !!moves?.UsePowerPlant?.some((move) => move.powerPlant === powerPlant.number);
    }

    // The fuel a hybrid plant can burn besides oil: coal for the standard hybrid,
    // garbage for the alternate deck's garbage/oil hybrid. Undefined for other plants.
    hybridFuel(powerPlant: PowerPlant): ResourceType.Coal | ResourceType.Garbage | undefined {
        if (powerPlant.type == PowerPlantType.Hybrid) return ResourceType.Coal;
        if (powerPlant.type == PowerPlantType.GarbageOilHybrid) return ResourceType.Garbage;
        return undefined;
    }

    powerPlantClick(powerPlant: PowerPlant) {
        const other = this.hybridFuel(powerPlant);
        if (this.phase == Phase.Bureaucracy && other) {
            const otherLeft = other == ResourceType.Coal ? this.player.coalLeft : this.player.garbageLeft;
            if (
                otherLeft == 0 ||
                this.player.oilLeft == 0 ||
                otherLeft + this.player.oilLeft == powerPlant.cost
            ) {
                this.player.resourcesUsed = Array(Math.min(powerPlant.cost, otherLeft))
                    .fill(other)
                    .concat(
                        Array(powerPlant.cost - Math.min(powerPlant.cost, otherLeft)).fill(ResourceType.Oil)
                    );
                this.$emit('powerPlantClick', powerPlant);
            } else {
                this.powerPlantClicked = powerPlant;
                this.player.resourcesUsed = Array(powerPlant.cost).fill(null);
            }
        } else {
            this.$emit('powerPlantClick', powerPlant);
        }
    }

    get canClickResources() {
        return (
            (this.player.availableMoves && this.player.availableMoves['DiscardResources']) ||
            this.player.resourcesUsed.some(r => r == null)
        );
    }

    // Whether this resource can be clicked: offered as a discard, or a fuel of the
    // hybrid plant whose resources are being chosen.
    canClickResource(resourceType: ResourceType) {
        const discards = this.player.availableMoves?.DiscardResources;
        if (discards) {
            // The engine only handles garbage discards for garbage/oil hybrid owners.
            if (resourceType == ResourceType.Garbage && !this.player.garbageOilHybridCapacity) return false;
            return discards.includes(resourceType);
        }
        if (!this.player.resourcesUsed.some(r => r == null)) return false;
        // Without the clicked plant (not expected), fall back to the coal/oil hybrid.
        const other = this.powerPlantClicked ? this.hybridFuel(this.powerPlantClicked) : ResourceType.Coal;
        return resourceType == ResourceType.Oil || resourceType == other;
    }

    clickResource(resourceType) {
        if (this.player.availableMoves && this.player.availableMoves['DiscardResources']) {
            this.$emit('discardResource', resourceType);
        } else if (this.player.resourcesUsed.some(r => r == null)) {
            const index = this.player.resourcesUsed.findIndex(r => r == null)!;
            this.player.resourcesUsed[index] = resourceType;

            if (resourceType == 'coal') {
                this.player.coalLeft--;
            } else if (resourceType == 'oil') {
                this.player.oilLeft--;
            } else if (resourceType == 'garbage') {
                this.player.garbageLeft--;
            }

            if (!this.player.resourcesUsed.some(r => r == null)) {
                this.$emit('powerPlantClick', this.powerPlantClicked);
            }
        }
    }
}
</script>
<style scoped>
/* Fuel you have no room for yet steps back so the stock you can use stands out. */
.fuel-stock.empty {
    opacity: 0.35;
}
.auction-auto-pass.editable {
    cursor: pointer;
}
.auction-auto-pass.editable:hover .auto-pass-hit {
    fill: #ffffff30;
}
.auction-auto-pass:focus {
    outline: none;
}
.auction-auto-pass:focus-visible .auto-pass-hit {
    stroke: currentColor;
    stroke-width: 2;
}
</style>
