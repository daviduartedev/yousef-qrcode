import { useEffect, useRef } from "react";
import QRCodeStyling, {
    CornerSquareType,
    DotType,
    CornerDotType,
    GradientType,
    TypeNumber,
    Mode,
    ErrorCorrectionLevel,
} from "qr-code-styling";
import QRCodeSvgCustom from "./QRCodeSvgCustom";

interface QRCodeStyledProps {
    data: string;
    width?: number;
    height?: number;
    image?: string;
    dotsOptions?: {
        color?: string;
        type?: DotType;
        gradient?: {
            type: GradientType;
            rotation?: number;
            colorStops: { offset: number; color: string }[];
        };
    };
    cornersSquareOptions?: {
        color?: string;
        type?: CornerSquareType;
        gradient?: {
            type: GradientType;
            rotation?: number;
            colorStops: { offset: number; color: string }[];
        };
    };
    cornersDotOptions?: {
        color?: string;
        type?: CornerDotType;
        gradient?: {
            type: GradientType;
            rotation?: number;
            colorStops: { offset: number; color: string }[];
        };
    };
    backgroundOptions?: {
        color?: string;
        gradient?: {
            type: GradientType;
            rotation?: number;
            colorStops: { offset: number; color: string }[];
        };
    };
    imageOptions?: {
        hideBackgroundDots?: boolean;
        imageSize?: number;
        margin?: number;
        crossOrigin?: string;
    };
    qrOptions?: {
        typeNumber?: TypeNumber;
        mode?: Mode;
        errorCorrectionLevel?: ErrorCorrectionLevel;
    };
}

const QRCodeStyled = ({
    data,
    width = 300,
    height = 300,
    image,
    dotsOptions = {},
    cornersSquareOptions = {},
    cornersDotOptions = {},
    backgroundOptions = {},
    imageOptions = {},
    qrOptions = {},
}: QRCodeStyledProps) => {
    const ref = useRef<HTMLDivElement>(null);
    const qrCode = useRef<QRCodeStyling | null>(null);

    const dotsType = dotsOptions?.type;
    const useCustomSvg = dotsType === "classy" || dotsType === "rounded";

    useEffect(() => {
        if (useCustomSvg) return;
        try {
            // Clear string cleanup to prevent duplicates
            if (ref.current) {
                ref.current.innerHTML = '';
            }

            qrCode.current = new QRCodeStyling({
                width,
                height,
                data,
                image,
                dotsOptions,
                cornersSquareOptions,
                cornersDotOptions,
                backgroundOptions,
                imageOptions,
                qrOptions,
                type: "svg" // Enforce SVG rendering potentially solving canvas issues
            });

            if (ref.current) {
                qrCode.current.append(ref.current);
            }
        } catch (err) {
            console.error("Failed to initialize QRCodeStyling", err);
        }
    }, [useCustomSvg, width, height, data, image, dotsOptions, cornersSquareOptions, cornersDotOptions, backgroundOptions, imageOptions, qrOptions]);

    if (useCustomSvg) {
        return (
            <QRCodeSvgCustom
                data={data}
                width={width}
                height={height}
                dotsType={dotsType!}
                dotsColor={dotsOptions?.color}
                backgroundColor={backgroundOptions?.color}
                cornersSquareType={cornersSquareOptions?.type}
                cornersSquareColor={cornersSquareOptions?.color}
                cornersDotType={cornersDotOptions?.type}
                cornersDotColor={cornersDotOptions?.color}
                image={image}
                imageOptions={imageOptions}
                qrOptions={qrOptions}
            />
        );
    }

    return <div ref={ref} />;
};

export default QRCodeStyled;
