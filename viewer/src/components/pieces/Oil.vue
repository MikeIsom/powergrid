<template>
    <g
        :id="elId"
        :class="[{ canClick: canClick }]"
        :transform="`translate(${currentX}, ${currentY}) scale(${scale})`"
        :opacity="pieceOpacity"
        @click="canClick && $emit('click')"
    >
        <!-- Drop of crude, light rim so it reads on dark board cells. -->
        <path
            d="M10,1 C10,1 3.8,8.6 3.8,12.6 A6.2,6.2 0 0,0 16.2,12.6 C16.2,8.6 10,1 10,1Z"
            fill="#1b1e25"
            stroke="#d6dde6"
            stroke-width="0.9"
            stroke-linejoin="round"
        />
        <path
            d="M6.9,11.6 A3.4,3.4 0 0,0 8.6,16.4"
            fill="none"
            stroke="#fff"
            stroke-opacity="0.7"
            stroke-width="1.4"
            stroke-linecap="round"
        />

        <title>Oil</title>
    </g>
</template>
<script lang="ts">
import { PieceType } from './../../types/ui-data';
import { Component, Mixins, Prop } from 'vue-property-decorator';
import Piece from './Piece.vue';

@Component({
    created(this: Oil) {
        this.pieceType = PieceType.Oil;
    }
})
export default class Oil extends Mixins(Piece) {
    @Prop()
    canClick?: boolean;

    @Prop({ default: 1 })
    scale?: number;
}
</script>
