<template>
    <g
        :id="elId"
        :class="[{ canClick: canClick }]"
        :transform="`translate(${currentX}, ${currentY})`"
        :opacity="pieceOpacity"
        @click="canClick && $emit('click')"
    >
        <!-- Fuel rod with a radiation trefoil. -->
        <rect x="4.6" y="1" width="10.8" height="18" rx="5.4" fill="#c8102e" stroke="#000" stroke-width="1" />
        <circle cx="10" cy="10" r="4.6" fill="#ffe14d" />
        <path
            d="M8.50,10.00 L6.00,10.00 A4,4 0 0,1 8.00,6.54 L9.25,8.70 A1.5,1.5 0 0,0 8.50,10.00Z M10.75,8.70 L12.00,6.54 A4,4 0 0,1 14.00,10.00 L11.50,10.00 A1.5,1.5 0 0,0 10.75,8.70Z M10.75,11.30 L12.00,13.46 A4,4 0 0,1 8.00,13.46 L9.25,11.30 A1.5,1.5 0 0,0 10.75,11.30Z"
            fill="#111"
        />
        <circle cx="10" cy="10" r="1" fill="#111" />

        <title>Uranium</title>
    </g>
</template>
<script lang="ts">
import { PieceType } from './../../types/ui-data';
import { Component, Mixins, Prop } from 'vue-property-decorator';
import Piece from './Piece.vue';

@Component({
    created(this: Uranium) {
        this.pieceType = PieceType.Uranium;
    }
})
export default class Uranium extends Mixins(Piece) {
    @Prop()
    canClick?: boolean;
}
</script>
