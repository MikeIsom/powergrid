<template>
    <g
        :id="elId"
        :class="[{ canClick: canClick }]"
        :transform="`translate(${currentX}, ${currentY}) scale(${scale / 0.08})`"
        :opacity="pieceOpacity"
        @click="canClick && $emit('click')"
    >
        <!-- Faceted lump. Drawn in the shared 20-unit frame; the 0.08 default
             keeps callers' scales from the original, larger artwork. -->
        <g>
            <path
                d="M2.5,8 L7,2.5 L13.5,1.5 L18.5,6 L17.5,14.5 L11,18.5 L3.5,16Z"
                fill="#3d2717"
                stroke="#000"
                stroke-width="1.1"
                stroke-linejoin="round"
            />
            <path d="M2.5,8 L7,2.5 L13.5,1.5 L18.5,6 L11,8.5Z" fill="#8a5c3b" />
            <path d="M2.5,8 L11,8.5 L11,18.5 L3.5,16Z" fill="#5e3d26" />
            <path d="M6.5,5.5 L9.5,4.2" stroke="#c49a74" stroke-width="0.9" stroke-linecap="round" />
        </g>

        <title>Coal</title>
    </g>
</template>
<script lang="ts">
import { PieceType } from './../../types/ui-data';
import { Component, Mixins, Prop } from 'vue-property-decorator';
import Piece from './Piece.vue';

@Component({
    created(this: Coal) {
        this.pieceType = PieceType.Coal;
    }
})
export default class Coal extends Mixins(Piece) {
    @Prop()
    canClick?: boolean;

    @Prop({ default: 0.08 })
    scale?: number;
}
</script>
