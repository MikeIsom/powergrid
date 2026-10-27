<template>
    <g :id="elId" :class="['piece']" :transform="`translate(${currentX}, ${currentY})`">
        <g transform="scale(0.8)">
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
        </g>
        <g transform="translate(7, 2) scale(0.8)">
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
        </g>

        <title>Coal/Oil</title>
    </g>
</template>
<script lang="ts">
import { PieceType } from './../../types/ui-data';
import { Component, Mixins } from 'vue-property-decorator';
import Piece from './Piece.vue';

@Component({
    created(this: Hybrid) {
        this.pieceType = PieceType.Hybrid;
    }
})
export default class Hybrid extends Mixins(Piece) {
}
</script>
