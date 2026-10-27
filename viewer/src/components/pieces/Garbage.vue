<template>
    <g
        :id="elId"
        :class="[{ canClick: canClick }]"
        :transform="`translate(${currentX}, ${currentY}) scale(${scale})`"
        :opacity="pieceOpacity"
        @click="canClick && $emit('click')"
    >
        <!-- Bin with lid and ribs. -->
        <path d="M8,4 V2.4 H12 V4" fill="none" stroke="#000" stroke-width="1.1" />
        <path
            d="M4.6,6.5 H15.4 L14.2,18.4 H5.8Z"
            fill="#e8c547"
            stroke="#000"
            stroke-width="1"
            stroke-linejoin="round"
        />
        <rect x="2.8" y="3.8" width="14.4" height="2.9" rx="0.8" fill="#b68f1a" stroke="#000" stroke-width="1" />
        <path d="M8,9 V16.2 M10,9 V16.2 M12,9 V16.2" stroke="#7a5f0f" stroke-width="1.1" stroke-linecap="round" />

        <title>Garbage</title>
    </g>
</template>
<script lang="ts">
import { PieceType } from './../../types/ui-data';
import { Component, Mixins, Prop } from 'vue-property-decorator';
import Piece from './Piece.vue';

@Component({
    created(this: Garbage) {
        this.pieceType = PieceType.Garbage;
    }
})
export default class Garbage extends Mixins(Piece) {
    @Prop()
    canClick?: boolean;

    @Prop({ default: 1 })
    scale?: number;
}
</script>
