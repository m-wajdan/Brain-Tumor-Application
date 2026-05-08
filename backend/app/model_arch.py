"""
HybridDANet model architecture.

Reproduced faithfully from the training notebook (Cells 19-21).
Architecture: U-Net backbone with DCB (Double Conv Block), RM (Residual Module),
MCS (Multi-Channel Multi-Scale), and HWADA (Hybrid Weight Alignment with
Multi-Dilated Attention) skip-connection gating.

Input  : (B, 4, D, H, W)  – 4 MRI modalities
Output : (B, 3, D, H, W)  – raw logits for WT, TC, ET
"""

import torch
import torch.nn as nn
import torch.nn.functional as F


# ── Base Modules ─────────────────────────────────────────────────────────────

class DCB(nn.Module):
    """Double Convolutional Block: Conv3x3 → GN → ReLU → Conv3x3 → GN → ReLU"""

    def __init__(self, in_ch, out_ch):
        super().__init__()
        self.block = nn.Sequential(
            nn.Conv3d(in_ch, out_ch, kernel_size=3, padding=1),
            nn.GroupNorm(8, out_ch),
            nn.ReLU(inplace=True),
            nn.Conv3d(out_ch, out_ch, kernel_size=3, padding=1),
            nn.GroupNorm(8, out_ch),
            nn.ReLU(inplace=True),
        )

    def forward(self, x):
        return self.block(x)


class RM(nn.Module):
    """Residual Module: BN+ReLU → Conv → BN+ReLU → Conv → Conv + skip"""

    def __init__(self, ch):
        super().__init__()
        self.bn1 = nn.BatchNorm3d(ch)
        self.conv1 = nn.Conv3d(ch, ch, kernel_size=3, padding=1)
        self.bn2 = nn.BatchNorm3d(ch)
        self.conv2 = nn.Conv3d(ch, ch, kernel_size=3, padding=1)
        self.conv3 = nn.Conv3d(ch, ch, kernel_size=3, padding=1)
        self.relu = nn.ReLU(inplace=True)

    def forward(self, x):
        res = x
        out = self.conv1(self.relu(self.bn1(x)))
        out = self.conv2(self.relu(self.bn2(out)))
        out = self.conv3(out)
        return out + res


class MCS(nn.Module):
    """Multi-Channel Multi-Scale Module"""

    def __init__(self, ch):
        super().__init__()
        self.squeeze = nn.Conv3d(ch, ch // 2, kernel_size=1)
        self.branch1 = nn.Conv3d(ch // 2, ch // 4, kernel_size=1)
        self.branch2 = nn.Conv3d(ch // 2, ch // 4, kernel_size=3, padding=1)
        self.restore = nn.Conv3d(ch // 2, ch, kernel_size=1)
        self.gn = nn.GroupNorm(8, ch)
        self.relu = nn.ReLU(inplace=True)

    def forward(self, x):
        x_sq = self.relu(self.squeeze(x))
        b1 = self.branch1(x_sq)
        b2 = self.branch2(x_sq)
        out = torch.cat([b1, b2], dim=1)
        return self.relu(self.gn(self.restore(out)))


# ── Attention Module ─────────────────────────────────────────────────────────

class HWADA(nn.Module):
    """Hybrid Weight Alignment with Multi-Dilated Attention"""

    def __init__(self, g_ch, x_ch, inter_ch, dilations):
        super().__init__()
        d1, d2 = dilations
        # Scheme branch 1
        self.g1 = nn.Sequential(
            nn.Conv3d(g_ch, inter_ch, 1),
            nn.Conv3d(inter_ch, inter_ch, 3, padding=d1, dilation=d1),
        )
        self.x1 = nn.Sequential(
            nn.Conv3d(x_ch, inter_ch, 1),
            nn.Conv3d(inter_ch, inter_ch, 3, padding=d1, dilation=d1),
        )
        # Scheme branch 2
        self.g2 = nn.Sequential(
            nn.Conv3d(g_ch, inter_ch, 1),
            nn.Conv3d(inter_ch, inter_ch, 3, padding=d2, dilation=d2),
        )
        self.x2 = nn.Sequential(
            nn.Conv3d(x_ch, inter_ch, 1),
            nn.Conv3d(inter_ch, inter_ch, 3, padding=d2, dilation=d2),
        )

        self.psi = nn.Sequential(nn.Conv3d(inter_ch, 1, 1), nn.Sigmoid())
        self.relu = nn.ReLU(inplace=True)

    def forward(self, g, x):
        # Match g's spatial size to x if needed (due to upsampling)
        if g.shape[2:] != x.shape[2:]:
            g = F.interpolate(
                g, size=x.shape[2:], mode="trilinear", align_corners=False
            )

        s1 = self.g1(g) + self.x1(x)
        s2 = self.g2(g) + self.x2(x)
        attn = self.psi(self.relu(s1 + s2))
        return x * attn


# ── Full HybridDANet Assembly ────────────────────────────────────────────────

class HybridDANet(nn.Module):
    """
    Full HybridDANet for 3D brain tumor segmentation.

    Encoder: 4 stages (16 → 32 → 64 → 128 channels) with DCB + RM + MCS
    Bottleneck: 256 channels
    Decoder: 4 stages with transposed convolutions and HWADA attention gating
    """

    def __init__(self, in_ch=4, out_ch=3):
        super().__init__()
        # Encoder
        self.e1 = nn.Sequential(DCB(in_ch, 16), RM(16), MCS(16))
        self.d1 = nn.Conv3d(16, 32, 2, stride=2)
        self.e2 = nn.Sequential(DCB(32, 32), RM(32), MCS(32))
        self.d2 = nn.Conv3d(32, 64, 2, stride=2)
        self.e3 = nn.Sequential(DCB(64, 64), RM(64), MCS(64))
        self.d3 = nn.Conv3d(64, 128, 2, stride=2)
        self.e4 = nn.Sequential(DCB(128, 128), RM(128), MCS(128))
        self.d4 = nn.Conv3d(128, 256, 2, stride=2)

        # Bottleneck
        self.b = nn.Sequential(DCB(256, 256), RM(256), MCS(256))

        # HWADA Attention on Skips
        self.h4 = HWADA(g_ch=128, x_ch=128, inter_ch=64, dilations=(1, 7))
        self.h3 = HWADA(g_ch=64, x_ch=64, inter_ch=32, dilations=(1, 5))
        self.h2 = HWADA(g_ch=32, x_ch=32, inter_ch=16, dilations=(1, 2))
        self.h1 = HWADA(g_ch=16, x_ch=16, inter_ch=8, dilations=(1, 1))

        # Decoder
        self.up4 = nn.ConvTranspose3d(256, 128, 2, stride=2)
        self.dec4 = nn.Sequential(DCB(256, 128), RM(128), MCS(128))

        self.up3 = nn.ConvTranspose3d(128, 64, 2, stride=2)
        self.dec3 = nn.Sequential(DCB(128, 64), RM(64), MCS(64))

        self.up2 = nn.ConvTranspose3d(64, 32, 2, stride=2)
        self.dec2 = nn.Sequential(DCB(64, 32), RM(32), MCS(32))

        self.up1 = nn.ConvTranspose3d(32, 16, 2, stride=2)
        self.dec1 = nn.Sequential(DCB(32, 16), RM(16), MCS(16))

        self.final = nn.Conv3d(16, out_ch, 1)

    def forward(self, x):
        # Encoder
        s1 = self.e1(x)
        s2 = self.e2(self.d1(s1))
        s3 = self.e3(self.d2(s2))
        s4 = self.e4(self.d3(s3))

        # Bottleneck
        feat = self.b(self.d4(s4))

        # Decoder 4
        up4 = self.up4(feat)
        h4 = self.h4(up4, s4)
        feat = self.dec4(torch.cat([h4, up4], dim=1))

        # Decoder 3
        up3 = self.up3(feat)
        h3 = self.h3(up3, s3)
        feat = self.dec3(torch.cat([h3, up3], dim=1))

        # Decoder 2
        up2 = self.up2(feat)
        h2 = self.h2(up2, s2)
        feat = self.dec2(torch.cat([h2, up2], dim=1))

        # Decoder 1
        up1 = self.up1(feat)
        h1 = self.h1(up1, s1)
        feat = self.dec1(torch.cat([h1, up1], dim=1))

        return self.final(feat)
